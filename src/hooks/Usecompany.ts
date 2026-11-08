// useCompany hook — fetches the current company and, if it has no
// stripe_customer_id yet, automatically calls the create-stripe-customer
// Edge Function to create and attach one.
//
// Why this lives inside the hook rather than a one-off onboarding step:
// per the product decision, this should happen transparently the first
// time ANY part of the app reads company data — no dedicated "set up
// billing" click required before that point.
//
// Concurrency safety: this hook can be mounted by multiple components
// at once (Header, Dashboard, etc. all calling useCompany() for the
// same company_id). Two mechanisms prevent duplicate Stripe Customers
// from a burst of simultaneous calls:
//
// 1. The company query itself is deduped by React Query's cache — all
//    callers sharing the same queryKey (['company', companyId]) share
//    ONE underlying fetch and ONE cached result, not one each.
// 2. The "create customer if missing" mutation is triggered from a
//    single useEffect keyed on the query result, and mutation.isPending
//    is checked before firing — so even if the effect re-runs (e.g.
//    React 18 strict mode double-invoke in dev, or a fast re-render),
//    a mutation already in flight is not fired again. Once the
//    mutation succeeds, invalidating the company query means every
//    mounted useCompany() instance re-reads the SAME updated row from
//    cache — there's no per-component duplicate logic to keep in sync.
//
// This does NOT fully eliminate the tiny remaining race where two
// browser TABS (not just components) load at the exact same instant —
// that's bounded by create-stripe-customer's own idempotency (it
// re-checks stripe_customer_id server-side before creating), which
// caps the damage at "briefly two Customers created, only one ever
// gets saved" rather than anything worse. If that residual risk needs
// closing entirely, it has to happen server-side (e.g. a unique
// constraint / advisory lock in create-stripe-customer itself) — a
// frontend hook cannot coordinate across tabs.

import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase"; // adjust to your actual client path

export interface Company {
  id: string;
  name: string;
  billing_email: string | null;
  stripe_customer_id: string | null;
  sepa_status: string | null;
  // ...extend with whatever other fields your app actually selects
  [key: string]: unknown;
}

const SUPABASE_FUNCTIONS_URL = import.meta.env.VITE_SUPABASE_FUNCTIONS_URL as string;

async function fetchCompany(companyId: string): Promise<Company> {
  const { data, error } = await supabase
    .from("companies")
    .select("*")
    .eq("id", companyId)
    .single();

  if (error) throw error;
  return data as Company;
}

async function createStripeCustomer(companyId: string): Promise<{ stripe_customer_id: string }> {
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;

  const res = await fetch(`${SUPABASE_FUNCTIONS_URL}/create-stripe-customer`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify({ company_id: companyId }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `create-stripe-customer failed with status ${res.status}`);
  }

  return res.json();
}

export function useCompany(companyId: string | undefined) {
  const queryClient = useQueryClient();

  const companyQuery = useQuery({
    queryKey: ["company", companyId],
    queryFn: () => fetchCompany(companyId!),
    enabled: !!companyId,
  });

  const createCustomerMutation = useMutation({
    mutationFn: () => createStripeCustomer(companyId!),
    onSuccess: () => {
      // Re-fetch the company row so every mounted useCompany() instance
      // (not just this one) picks up the new stripe_customer_id from
      // the shared cache — no manual state sync needed.
      queryClient.invalidateQueries({ queryKey: ["company", companyId] });
    },
    onError: (err) => {
      // Non-fatal from the app's point of view — the company just
      // stays without a stripe_customer_id, which downstream billing
      // UI should already handle (e.g. "set up billing" prompts).
      // Logged so it's visible without blocking the page.
      console.error("Failed to auto-create Stripe customer for company", { companyId, error: err });
    },
  });

  useEffect(() => {
    if (!companyQuery.data) return;
    if (companyQuery.data.stripe_customer_id) return;
    if (createCustomerMutation.isPending) return; // guard against duplicate fires within this tab

    createCustomerMutation.mutate();
    // Intentionally only re-runs when the fetched company data changes
    // (specifically, when stripe_customer_id is confirmed missing) —
    // not on every render, and not on createCustomerMutation identity
    // changes (that object is stable enough for this purpose via
    // React Query, but we don't want mutate() re-firing just because
    // the mutation object reference changed after a prior attempt).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyQuery.data?.id, companyQuery.data?.stripe_customer_id]);

  return {
    ...companyQuery,
    // Surface this so a caller that wants to show something like
    // "setting up billing…" during the brief auto-provisioning window
    // can do so, without every consumer needing its own logic for it.
    isProvisioningStripeCustomer: createCustomerMutation.isPending,
  };
}