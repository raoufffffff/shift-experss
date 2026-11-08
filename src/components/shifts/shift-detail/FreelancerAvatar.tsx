// Freelancer avatar component

import type { FreelancerApplication } from './types';

interface FreelancerAvatarProps {
    freelancer: FreelancerApplication['freelancer'];
}

export function FreelancerAvatar({ freelancer }: FreelancerAvatarProps) {
    const initials = freelancer?.first_name && freelancer?.last_name
        ? `${freelancer.first_name.charAt(0)}${freelancer.last_name.charAt(0)}`
        : '?';

    if (freelancer?.profile_photo_url) {
        return (
            <img
                src={freelancer.profile_photo_url}
                alt={`${freelancer.first_name} ${freelancer.last_name}`}
                className="w-8 h-8 rounded-full object-cover border border-border"
                loading="lazy"
                width={32}
                height={32}
            />
        );
    }

    return (
        <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center border border-emerald-200 dark:border-emerald-800">
            <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">{initials}</span>
        </div>
    );
}
