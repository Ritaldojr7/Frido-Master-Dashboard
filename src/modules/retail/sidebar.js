/**
 * Retail module — sidebar navigation fragments.
 *
 * The shared Layout owns the overall sidebar shape and the icon path map; the
 * retail module contributes its own nav entries through these factories so all
 * retail links originate here. Each factory receives the Layout `ICONS` map to
 * keep icon styling consistent without duplicating icon path strings.
 */

/** The "Retail Analytics" group that sits inside the Analytics section. */
export function retailAnalyticsNavGroup(ICONS) {
    return {
        label: 'Retail Analytics',
        icon: ICONS.folder,
        children: [
            { path: 'https://dashboard.tangoeye.ai/auth/login', label: 'TangoEye AI', icon: ICONS.chart, isExternal: true },
            { path: 'https://pilot.goyoyo.ai/', label: 'YoYo AI', icon: ICONS.chart, isExternal: true },
            { path: 'https://docs.google.com/spreadsheets/d/1vDtjeVr60T3zQvFovHXMz6km_H46YkL91_C45SeiQAk/edit?gid=0#gid=0', label: 'NSO List', icon: ICONS.document, isExternal: true },
            { path: 'https://darling-pithivier-0b906d.netlify.app', label: 'Weekly Manpower Roster', icon: ICONS.globe, isExternal: true },
            { path: 'https://illustrious-bubblegum-509fc4.netlify.app', label: 'Store Visit Reporting', icon: ICONS.globe, isExternal: true },
            { path: 'https://claude.ai/public/artifacts/ff06101d-6b15-4dce-95e5-6ec8d7871419', label: 'Frido Inventory & Liquidation Dashboard', icon: ICONS.chart, isExternal: true },
        ],
    };
}

/** The retail entries that sit inside the Aggregator section (Retail Staff + Retail Admin). */
export function retailAggregatorNavItems(ICONS) {
    return [
        {
            label: 'Retail Staff',
            icon: ICONS.building,
            children: [
                { path: '/retail-staff', label: 'Retail Staff Portal', icon: ICONS.globe },
            ],
        },
        { path: '/retail-admin', label: 'Retail Admin', icon: ICONS.users },
    ];
}
