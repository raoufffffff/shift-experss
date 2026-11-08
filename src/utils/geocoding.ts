/**
 * Geocoding utility using Photon API (OpenStreetMap-based)
 * Free, worldwide coverage, no API key required
 *
 * For French addresses, we use the government API (api-adresse.data.gouv.fr)
 * which is more accurate for France.
 */

export interface GeocodingResult {
  latitude: number;
  longitude: number;
  city: string;
  country: string;
  formattedAddress: string;
  postalCode?: string;
  street?: string; // New field for granular address saving
  resultType?: 'housenumber' | 'street' | 'municipality' | 'locality';
}

interface PhotonFeature {
  geometry: {
    coordinates: [number, number]; // [lng, lat]
  };
  properties: {
    name?: string;
    city?: string;
    county?: string;
    state?: string;
    country?: string;
    postcode?: string;
    street?: string;
    housenumber?: string;
  };
}

interface PhotonResponse {
  features: PhotonFeature[];
}

interface FrenchAddressFeature {
  geometry: {
    coordinates: [number, number]; // [lng, lat]
  };
  properties: {
    label: string;
    name: string; // "8 Boulevard du Port"
    city: string;
    postcode: string;
    context: string;
    type: string; // "housenumber" | "street" | "municipality" | "locality"
    street?: string; // "Boulevard du Port"
    housenumber?: string;
  };
}

interface FrenchAddressResponse {
  features: FrenchAddressFeature[];
}

/**
 * Geocode a city/address using the French government API
 * More accurate for French addresses
 */
async function geocodeFrench(query: string): Promise<GeocodingResult | null> {
  try {
    const encodedQuery = encodeURIComponent(query);
    const response = await fetch(
      `https://api-adresse.data.gouv.fr/search/?q=${encodedQuery}&limit=1`
    );

    if (!response.ok) {
      throw new Error(`French API error: ${response.status}`);
    }

    const data: FrenchAddressResponse = await response.json();

    if (!data.features || data.features.length === 0) {
      return null;
    }

    const feature = data.features[0];
    const [longitude, latitude] = feature.geometry.coordinates;

    return {
      latitude,
      longitude,
      city: feature.properties.city,
      country: 'France',
      formattedAddress: feature.properties.label,
      postalCode: feature.properties.postcode,
      street: feature.properties.name, // Use 'name' which usually contains street + number
      resultType: feature.properties.type as GeocodingResult['resultType'],
    };
  } catch (error) {
    console.error('French geocoding error:', error);
    return null;
  }
}

/**
 * Geocode a city/address using Photon API (worldwide)
 */
async function geocodePhoton(query: string): Promise<GeocodingResult | null> {
  try {
    const encodedQuery = encodeURIComponent(query);
    const response = await fetch(
      `https://photon.komoot.io/api/?q=${encodedQuery}&limit=1`
    );

    if (!response.ok) {
      throw new Error(`Photon API error: ${response.status}`);
    }

    const data: PhotonResponse = await response.json();

    if (!data.features || data.features.length === 0) {
      return null;
    }

    const feature = data.features[0];
    const [longitude, latitude] = feature.geometry.coordinates;
    const props = feature.properties;

    // Build formatted address
    const addressParts: string[] = [];
    if (props.name) addressParts.push(props.name);
    if (props.city && props.city !== props.name) addressParts.push(props.city);
    if (props.state) addressParts.push(props.state);
    if (props.country) addressParts.push(props.country);

    // Try to construct street part
    let street = props.street;
    if (props.housenumber && street) {
      street = `${props.housenumber} ${street}`;
    } else if (props.name) {
      street = props.name;
    }

    return {
      latitude,
      longitude,
      city: props.city || props.name || query,
      country: props.country || '',
      formattedAddress: addressParts.join(', ') || query,
      postalCode: props.postcode,
      street: street
    };
  } catch (error) {
    console.error('Photon geocoding error:', error);
    return null;
  }
}

/**
 * Check if a query looks like a French address
 */
function looksLikeFrenchAddress(query: string): boolean {
  const frenchIndicators = [
    'france',
    'paris',
    'lyon',
    'marseille',
    'toulouse',
    'nice',
    'nantes',
    'bordeaux',
    'lille',
    'strasbourg',
    'rennes',
    'île-de-france',
    'provence',
    'bretagne',
    'normandie',
    'occitanie',
  ];

  const lowerQuery = query.toLowerCase();

  // Check for French postal code pattern (5 digits)
  if (/\b\d{5}\b/.test(query)) {
    return true;
  }

  // Check for French city names or regions
  return frenchIndicators.some((indicator) => lowerQuery.includes(indicator));
}

/**
 * Main geocoding function
 * Automatically uses French API for French addresses, Photon for others
 */
export async function geocodeAddress(query: string): Promise<GeocodingResult | null> {
  if (!query || query.trim().length < 2) {
    return null;
  }

  const trimmedQuery = query.trim();

  // Try French API first if it looks like a French address
  if (looksLikeFrenchAddress(trimmedQuery)) {
    const frenchResult = await geocodeFrench(trimmedQuery);
    if (frenchResult) {
      return frenchResult;
    }
  }

  // Fall back to Photon for worldwide coverage
  return geocodePhoton(trimmedQuery);
}

/**
 * Search for address suggestions using French API (autocomplete)
 */
async function searchFrenchAddresses(query: string, limit: number = 5): Promise<GeocodingResult[]> {
  try {
    const encodedQuery = encodeURIComponent(query);
    const response = await fetch(
      `https://api-adresse.data.gouv.fr/search/?q=${encodedQuery}&limit=${limit}`
    );

    if (!response.ok) {
      return [];
    }

    const data: FrenchAddressResponse = await response.json();

    return data.features.map((feature) => {
      const [longitude, latitude] = feature.geometry.coordinates;
      return {
        latitude,
        longitude,
        city: feature.properties.city,
        country: 'France',
        formattedAddress: feature.properties.label,
        postalCode: feature.properties.postcode,
        street: feature.properties.name, // Use 'name' for street+number
        resultType: feature.properties.type as GeocodingResult['resultType'],
      };
    });
  } catch (error) {
    console.error('French address search error:', error);
    return [];
  }
}

/**
 * Search for address suggestions (autocomplete)
 * Uses French API for French queries, Photon for worldwide
 */
export async function searchAddresses(query: string, limit: number = 5): Promise<GeocodingResult[]> {
  console.log('🌍 searchAddresses called with:', query);

  if (!query || query.trim().length < 2) {
    console.log('⚠️ Query too short, returning empty');
    return [];
  }

  const trimmedQuery = query.trim();

  // Always try French API first (most users are in France)
  console.log('📡 Calling French API...');
  const frenchResults = await searchFrenchAddresses(trimmedQuery, limit);
  console.log('📡 French API results:', frenchResults.length);
  if (frenchResults.length > 0) {
    return frenchResults;
  }

  // Fall back to Photon for worldwide coverage
  try {
    console.log('📡 Calling Photon API...');
    const encodedQuery = encodeURIComponent(trimmedQuery);
    const response = await fetch(
      `https://photon.komoot.io/api/?q=${encodedQuery}&limit=${limit}`
    );

    if (!response.ok) {
      console.log('❌ Photon API error:', response.status);
      return [];
    }

    const data: PhotonResponse = await response.json();
    console.log('📡 Photon API results:', data.features?.length || 0);

    return data.features.map((feature) => {
      const [longitude, latitude] = feature.geometry.coordinates;
      const props = feature.properties;

      const addressParts: string[] = [];
      if (props.name) addressParts.push(props.name);
      if (props.city && props.city !== props.name) addressParts.push(props.city);
      if (props.state) addressParts.push(props.state);
      if (props.country) addressParts.push(props.country);

      let street = props.street;
      if (props.housenumber && street) {
        street = `${props.housenumber} ${street}`;
      } else if (props.name) {
        street = props.name;
      }

      return {
        latitude,
        longitude,
        city: props.city || props.name || query,
        country: props.country || '',
        formattedAddress: addressParts.join(', ') || query,
        postalCode: props.postcode,
        street: street
      };
    });
  } catch (error) {
    console.error('Address search error:', error);
    return [];
  }
}
