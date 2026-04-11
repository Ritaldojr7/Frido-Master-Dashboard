/**
 * Centralized dashboard data configuration.
 * All links, sections, and categories are defined here.
 * To add/remove links, edit this file — no component changes needed.
 */

// Icons as SVG path data for lightweight inline rendering
export const ICONS = {
    sales: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    ticket: 'M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z',
    phone: 'M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z',
    chart: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
    book: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253',
    login: 'M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1',
    video: 'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z',
    globe: 'M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9',
    truck: 'M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0',
    megaphone: 'M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z',
    users: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
    star: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z',
    shield: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
    cog: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z',
    clipboard: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01',
    academic: 'M12 14l9-5-9-5-9 5 9 5z M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z',
    chat: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z',
    store: 'M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z',
    target: 'M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z',
    lightbulb: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z',
    arrowLeft: 'M10 19l-7-7m0 0l7-7m-7 7h18',
    camera: 'M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z M15 13a3 3 0 11-6 0 3 3 0 016 0z',
    creditCard: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z',
    document: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
    folder: 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z',
    link: 'M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1',
    photograph: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z',
    desktop: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
    speakerphone: 'M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z',
    hashtag: 'M7 20l4-16m2 16l4-16M6 9h14M4 15h14',
    table: 'M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z',
};

// ─── Master Dashboard Categories ───
export const dashboardCategories = [
    {
        id: 'revenue',
        title: 'Revenue Generating Verticals',
        icon: 'sales',
        accentColor: 'emerald',
        description: 'Core revenue streams and sales operations',
        links: [
            { title: 'Inside Sales Team India', route: '/inside-sales-india', icon: 'phone', isInternal: true },
            { title: 'Inside Sales Team Middle East', route: '/inside-sales-middle-east', icon: 'globe', isInternal: true },
            { title: 'Frido Experience Store', route: '/experience-store', icon: 'store', isInternal: true },
            { title: 'Retention Calling', route: '/retention-calling', icon: 'phone', isInternal: true },
            { title: 'Affiliate Program', url: '#', icon: 'users' },
            { title: 'KRI & KRA Tracker', url: '#', icon: 'target' },
        ],
    },
    {
        id: 'breakeven',
        title: 'Breakeven Verticals',
        icon: 'chart',
        accentColor: 'amber',
        description: 'Reputation management and customer experience',
        links: [
            { title: 'Online Reputation Management', route: '/online-reputation-management', icon: 'star', isInternal: true },
            { title: 'Feedback & Customer Experience Team', route: '/feedback-customer-experience', icon: 'chat', isInternal: true },
        ],
    },
    {
        id: 'salesops',
        title: 'Sales Ops',
        icon: 'cog',
        accentColor: 'blue',
        description: 'Operational tools for data, HR, and quality',
        links: [
            { title: 'Data Dashboard', url: '#', icon: 'chart' },
            { title: 'HR Operations', url: '#', icon: 'users' },
            { title: 'Quality Control', url: '#', icon: 'shield' },
            { title: 'Retail Operations', url: '#', icon: 'store' },
            { title: 'Hypotheses Tracking', url: '#', icon: 'lightbulb' },
            { title: 'Learning and Development (L&D)', url: '#', icon: 'academic' },
        ],
    },
    {
        id: 'crossdept',
        title: 'Cross Dept Functional',
        icon: 'users',
        accentColor: 'purple',
        description: 'Cross-departmental shared functions',
        links: [
            { title: 'Logistics', url: '#', icon: 'truck' },
            { title: 'Marketing', url: '#', icon: 'megaphone' },
        ],
    },
];

// ─── Inside Sales India Sections ───
export const insideSalesIndiaData = {
    title: 'Inside Sales – India',
    backRoute: '/',
    sections: [
        {
            id: 'raise-ticket',
            title: 'Raise a Ticket',
            icon: 'ticket',
            accentColor: 'amber',
            links: [
                { title: 'CS Ticket', url: 'https://myfrido.slack.com/archives/C0A59S3BYB1', variant: 'dark' },
                { title: 'Bulk Order', url: '#', variant: 'amber' },
                { title: 'GST Form', url: 'https://form.asana.com/?k=aRlrsFCkrJRDTUdLHizQ1g&d=1207389811595677', variant: 'dark' },
            ],
        },
        {
            id: 'pre-booking',
            title: 'Pre Booking',
            icon: 'store',
            accentColor: 'amber',
            links: [
                { title: 'Out of Stock / Prebooking Form', url: 'https://forms.office.com/pages/responsepage.aspx?id=OstcfonxOk6Vslz8wOMPkP3V4UQLfl5Powhxs_2h4eRUODFXRFNDTTQyT0NBRVFQMVdDNktFRTI3Qi4u&route=shorturl', variant: 'dark' },
                { title: 'Chair Waitlist', url: '#', variant: 'amber' },
                { title: 'Request a Discount Code', url: '#', variant: 'dark' },
            ],
        },
        {
            id: 'crm-logins',
            title: 'CRM & Logins',
            icon: 'login',
            accentColor: 'blue',
            links: [
                { title: 'Limechat – CRM', url: '#', variant: 'blue' },
                { title: 'Salesforce – CRM', url: '#', variant: 'blue' },
                { title: 'HRMS Login', url: '#', variant: 'dark' },
            ],
        },
        {
            id: 'ivr',
            title: 'IVR',
            icon: 'phone',
            accentColor: 'emerald',
            links: [
                { title: 'IVR – Knowlarity', url: '#', variant: 'emerald' },
                { title: 'IVR – Convox', url: '#', variant: 'emerald' },
            ],
        },
        {
            id: 'reference',
            title: 'Reference',
            icon: 'book',
            accentColor: 'amber',
            links: [
                { title: 'Frido Product Canvas', url: 'https://myfrido-my.sharepoint.com/personal/maitrali_n_myfrido_com/_layouts/15/onedrive.aspx?id=%2Fpersonal%2Fmaitrali%5Fn%5Fmyfrido%5Fcom%2FDocuments%2FFrido%5FMaitrali%2FFrido%20Canvas%2FThe%20Frido%20Canvas%2Epdf&parent=%2Fpersonal%2Fmaitrali%5Fn%5Fmyfrido%5Fcom%2FDocuments%2FFrido%5FMaitrali%2FFrido%20Canvas&ga=1', variant: 'amber' },
                { title: 'Brochures', url: '#', variant: 'amber' },
                { title: 'Frido Gallery Playbook', url: 'https://www.playbook.com/s/frido-products/c5dFTKhCukjNyov721YisqAY', variant: 'amber' },
                { title: 'Pin Code TAT Sheet', url: 'https://docs.google.com/spreadsheets/d/1I4MWPOsh5IZIDxW0CpOgs9RkeZzEzCJnUNkwXDmr2hA/edit?gid=1285111460#gid=1285111460', variant: 'amber' },
                { title: 'IST WhatsApp Message Template', url: 'https://www.notion.so/Inside-Sales-Team-WhatsApp-Template-2271ea8a551480f7b8bcc74fdb31d3a1', variant: 'amber' },
            ],
        },
        {
            id: 'analytics',
            title: 'Analytics Dashboard',
            icon: 'chart',
            accentColor: 'blue',
            links: [
                { title: 'Live Sales Dashboard', url: '#', variant: 'blue' },
                { title: 'Agent Specific Dashboard', url: '#', variant: 'dark' },
            ],
        },
        {
            id: 'video-call',
            title: 'Video Call',
            icon: 'video',
            accentColor: 'purple',
            links: [
                { title: 'Shop On Video Call', url: '#', variant: 'dark' },
            ],
        },
    ],
};

// ─── Inside Sales Middle East Sections ───
export const insideSalesMiddleEastData = {
    title: 'Inside Sales – Middle East',
    backRoute: '/',
    sections: [
        {
            id: 'raise-ticket',
            title: 'Raise a Ticket',
            icon: 'ticket',
            accentColor: 'amber',
            links: [
                { title: 'CS Form', url: 'https://myfrido.slack.com/archives/C0A59S3BYB1', variant: 'dark' },
            ],
        },
        {
            id: 'references',
            title: 'References',
            icon: 'book',
            accentColor: 'amber',
            links: [
                { title: 'IST WhatsApp Message Template', url: '#', variant: 'amber' },
            ],
        },
    ],
};

// ─── Experience Store Sections ───
export const experienceStoreData = {
    title: 'Experience Store',
    backRoute: '/',
    sections: [
        {
            id: 'raise-ticket',
            title: 'Raise a Ticket',
            icon: 'ticket',
            accentColor: 'amber',
            links: [
                { title: 'Raise a CS Ticket', url: 'https://myfrido.slack.com/archives/C0A59S3BYB1', variant: 'dark' },
                { title: 'Request a GST Bill', url: 'https://form.asana.com/?k=aRlrsFCkrJRDTUdLHizQ1g&d=1207389811595677', variant: 'dark' },
                { title: 'Raise a Custom Insole Ticket', url: '#', variant: 'dark' },
                { title: 'Raise a Custom MT Ticket', url: '#', variant: 'dark' },
            ],
        },
        {
            id: 'crm-logins',
            title: 'CRM & Logins',
            icon: 'login',
            accentColor: 'blue',
            links: [
                { title: 'DevX Pos Login', url: '#', variant: 'dark' },
                { title: 'Amply SOP Login', url: '#', variant: 'dark' },
                { title: 'Greyt HR MS Login', url: '#', variant: 'dark' },
                { title: 'Frido Internal Tech', url: '#', variant: 'dark' },
                { title: 'Wilyer CMS', url: '#', variant: 'dark' },
                { title: 'Razorpay Bill Me', url: '#', variant: 'dark' },
                { title: 'ES – Customer Facing', url: '#', variant: 'dark' },
            ],
        },
        {
            id: 'back-office',
            title: 'Back Office Login',
            icon: 'desktop',
            accentColor: 'amber',
            links: [
                { title: 'IVR – Knowlarity', url: '#', variant: 'amber' },
                { title: 'Chat CRM – Limechat', url: '#', variant: 'amber' },
                { title: 'Access Live Feed of Camera', url: '#', variant: 'amber' },
                { title: 'Incoming Call CRM – Zoho Bigin', url: '#', variant: 'amber' },
            ],
        },
        {
            id: 'product-knowledge',
            title: 'Product Knowledge : Reference',
            icon: 'book',
            accentColor: 'blue',
            links: [
                { title: 'All R&D Documents', url: '#', variant: 'dark' },
                { title: 'Frido Product Canvas', url: 'https://myfrido-my.sharepoint.com/personal/maitrali_n_myfrido_com/_layouts/15/onedrive.aspx?id=%2Fpersonal%2Fmaitrali%5Fn%5Fmyfrido%5Fcom%2FDocuments%2FFrido%5FMaitrali%2FFrido%20Canvas%2FThe%20Frido%20Canvas%2Epdf&parent=%2Fpersonal%2Fmaitrali%5Fn%5Fmyfrido%5Fcom%2FDocuments%2FFrido%5FMaitrali%2FFrido%20Canvas&ga=1', variant: 'dark' },
                { title: 'Frido Gallery Playbook (Live Photos)', url: 'https://www.playbook.com/s/frido-products/c5dFTKhCukjNyov721YisqAY', variant: 'dark' },
                { title: 'Pin Code TAT Data Sheet', url: 'https://docs.google.com/spreadsheets/d/1I4MWPOsh5IZIDxW0CpOgs9RkeZzEzCJnUNkwXDmr2hA/edit?gid=1285111460#gid=1285111460', variant: 'dark' },
                { title: 'Marketing Brief – Notion', url: '#', variant: 'dark' },
                { title: 'Marketing Brief PDF', url: '#', variant: 'dark' },
            ],
        },
        {
            id: 'data-analytics',
            title: 'Data and Analytics',
            icon: 'chart',
            accentColor: 'blue',
            links: [
                { title: 'Analytics Dashboard', url: '#', variant: 'dark' },
            ],
        },
        {
            id: 'pre-booking',
            title: 'Pre Booking',
            icon: 'store',
            accentColor: 'emerald',
            links: [
                { title: 'Out of Stock / Prebooking Form', url: 'https://forms.office.com/pages/responsepage.aspx?id=OstcfonxOk6Vslz8wOMPkP3V4UQLfl5Powhxs_2h4eRUODFXRFNDTTQyT0NBRVFQMVdDNktFRTI3Qi4u&route=shorturl', variant: 'dark' },
                { title: 'Chair Waitlist', url: '#', variant: 'dark' },
            ],
        },
    ],
};

// ─── Retention Calling Sections ───
export const retentionCallingData = {
    title: 'Retention Calling',
    backRoute: '/',
    sections: [
        {
            id: 'tools',
            title: 'Tools',
            icon: 'cog',
            accentColor: 'blue',
            links: [
                { title: 'Shopify', url: 'https://accounts.shopify.com/lookup?rid=0e941925-b1df-4994-a465-3d231a72a7f4&verify=1772712580-m93obOfJ8t1cVJ6K85h2THfP3yld897i8lvhKQIx20s%3D', variant: 'dark' },
                { title: 'Limechat', url: 'https://sso.limechat.ai/u/login?state=hKFo2SBoX01LVFZhdzNhb2RjWWJyWFN3MlFIa2xsWlp5UXRJeKFur3VuaXZlcnNhbC1sb2dpbqN0aWTZIHBrRGk2N3RjeGdCWXNCSWFvcGNiWVNzdkpubUNfWHJso2NpZNkgUFpiVzhCUmdoM3VKekY3bU5nanRvQmk0dEVMWko5ZHU', variant: 'dark' },
            ],
        },
    ],
};

// ─── Online Reputation Management Sections ───
export const onlineReputationManagementData = {
    title: 'Online Reputation Management',
    backRoute: '/',
    sections: [
        {
            id: 'tools',
            title: 'Tools',
            icon: 'cog',
            accentColor: 'amber',
            links: [
                { title: 'Simplify', url: 'https://suitex.simplify360.com/apps/auth/login', variant: 'dark' },
                { title: 'Gorgias', url: 'https://myfrido.gorgias.com/idp/login?next=%2Fidp%2Foauth%2Fauthorize%3Fresponse_type%3Dcode%26client_id%3D68c9cf425472a3175a148eb7%26redirect_uri%3Dhttps%253A%252F%252Fmyfrido.gorgias.com%252Flogin%252Fidp%26scope%3Dopenid%2Bemail%2Bprofile%26state%3DeyJyZXRyeS1jb3VudCI6IDB9%26nonce%3DESq7hXpxOZf9sLPxE8Qe&fresh=true', variant: 'amber' },
                { title: 'Slack', url: 'https://myfrido.slack.com/', variant: 'amber' },
                { title: 'Meta Business Suite', url: 'https://business.facebook.com/business/loginpage/new/?next=https%3A%2F%2Fbusiness.facebook.com%2Flatest%2Fhome%3Fbusiness_id%3D1892700657712278%26asset_id%3D1826621550927153%26nav_ref%3Dbiz_unified_f3_login_page_to_mbs&login_options%5B0%5D=FB&login_options%5B1%5D=IG&login_options%5B2%5D=SSO&config_ref=biz_login_tool_flavor_mbs', variant: 'amber' },
                { title: 'Shopify', url: 'https://accounts.shopify.com/lookup?rid=0a9a21fb-6ca8-4910-8934-23e3aa9e7181&verify=1772710204-5ge1LLY0GliDcx3a3kvQbGwYb3VWv5a5L77a60GsEZk%3D', variant: 'amber' },
                { title: 'July Roaster', url: 'https://docs.google.com/spreadsheets/d/1mp2zgPt6GrvN1I62zB0BbP64XvkkD_tCfaXpfh5Cw5w/edit?gid=0#gid=0', variant: 'amber' },
            ],
        },
        {
            id: 'important-links',
            title: 'Important Links',
            icon: 'link',
            accentColor: 'amber',
            links: [
                { title: 'Whitelisted Sales Potential', url: 'https://docs.google.com/spreadsheets/d/1nlTg_0rhtKdxu2aY7HxPPwFHj5HuecQAuErdWKwpfVA/edit?gid=0#gid=0', variant: 'amber' },
                { title: 'Whitelisted – Negative', url: 'https://docs.google.com/spreadsheets/d/1imskxNTylChbPmhJEcWyhcoyCJGUGWNXMIdPwQ8O7fc/edit?gid=0#gid=0', variant: 'amber' },
                { title: 'Screenshots of Logistics Issues', url: 'https://www.notion.so/Social-Media-Comments-Logistics-SS-23891d3659af80fdadf3df53ccf767cb', variant: 'amber' },
                { title: 'Keyword Tracking', url: 'https://www.notion.so/Hashtag-Keyword-Tracking-Screenshot-23891d3659af806faabaec8e321f126e', variant: 'amber' },
                { title: 'Daily Sales Report Excel', url: '#', variant: 'amber' },
            ],
        },
    ],
};

// ─── Feedback & Customer Experience Sections ───
export const feedbackCustomerExperienceData = {
    title: 'Feedback & Customer Experience Department',
    backRoute: '/',
    sections: [
        {
            id: 'tools',
            title: 'Resources',
            icon: 'clipboard',
            accentColor: 'blue',
            links: [
                { title: 'Intent Generation Form', url: '#', variant: 'dark' },
                { title: 'Feedback Database (Notion)', url: 'https://docs.google.com/spreadsheets/d/1un8LIUMMZtbbHVhzMPdon9LVM8eqZU4jFeM0WXZWmMs/edit?usp=sharing', variant: 'blue' },
                { title: 'SOP Sheet', url: 'https://docs.google.com/spreadsheets/d/1L2pTa2EurRdh_PSTR7nD3NDRqHMBAyTotahUDguFNmg/edit?gid=0#gid=0', variant: 'dark' },
                { title: 'Feedback Core Team', url: 'https://docs.google.com/spreadsheets/d/1L2pTa2EurRdh_PSTR7nD3NDRqHMBAyTotahUDguFNmg/edit?gid=0#gid=0', variant: 'blue' },
            ],
        },
    ],
};
// ─── Staff Experience Store Sections ───
export const staffExperienceStoreData = {
    title: 'Retail Sales and Operations',
    backRoute: '', // No back route for staff since this is their homepage
    sections: [
        {
            id: 'after-sales-support',
            title: 'After Sales Support',
            icon: 'ticket',
            accentColor: 'amber',
            links: [
                { title: 'Raise a Customer Success Ticket', url: 'https://myfrido.slack.com/archives/C0A59S3BYB1', variant: 'dark', tooltip: 'POC : Shernyl | Note: This link will redirect you to the slack channel where you can use the workflow to submit the form' },
                { title: 'Raise a GST Bill', url: 'https://form.asana.com/?k=aRlrsFCkrJRDTUdLHizQ1g&d=1207389811595677', variant: 'dark', tooltip: 'POC : Shernyl' }
            ],
        },
        {
            id: 'day-to-day-operations',
            title: 'Day to Day Operations',
            icon: 'document',
            accentColor: 'blue',
            links: [
                { title: 'Raise Maintainence Ticket', url: 'https://form.asana.com/?k=T88A9GJZzo-RaSyJDacLYw&d=1207389811595677', variant: 'dark' },
                { title: 'Raise a Inventory Request', url: 'https://form.asana.com/?k=2mNtWIMKNygDDxCSPiYbNQ&d=1207389811595677', variant: 'dark' },
                { title: 'Raise a Reimbursement Request (New Joinees)', url: 'https://form.asana.com/?k=i-p9CI7ecwOX5u_8Hdz3tA&d=1207389811595677', variant: 'dark' },
                { title: 'QC Issues : Reverse Pickup', url: 'https://form.asana.com/?k=2mNtWIMKNygDDxCSPiYbNQ&d=1207389811595677', variant: 'dark' },
                { title: 'Raise a Prebooking Request', url: '#', variant: 'dark', isComingSoon: true },
            ],
        },
        {
            id: 'request-custom-product',
            title: 'Request Custom Product',
            icon: 'shopping-cart',
            accentColor: 'purple',
            links: [
                { title: 'Request a Custom Insole', url: '#', variant: 'dark', isComingSoon: true },
                { title: 'Request a Custom MT', url: '#', variant: 'dark', isComingSoon: true },
            ],
        },
        {
            id: 'crm-logins',
            title: 'CRM & Logins',
            icon: 'login',
            accentColor: 'emerald',
            links: [
                {
                    title: 'POS Login',
                    variant: 'dark',
                    tooltip: 'For credentials contact Arsh',
                    subOptions: [
                        { title: 'Mobility', url: 'https://posx-frido-mobility.devxcommerce.com/orders' },
                        { title: 'Non-Mobility', url: 'https://frido.devxcommerce.com/' }
                    ]
                },
                {
                    title: 'Amply SOP Login',
                    variant: 'dark',
                    tooltip: 'For credentials contact Arsh',
                    subOptions: [
                        { title: 'Login Dashboard', url: 'https://dashboard.getamply.co/login/?next=/amply/' },
                        { title: 'Install Android', url: 'https://play.google.com/store/apps/details?id=com.aiborne.amplyv1' },
                        { title: 'Install iOS', url: 'https://apps.apple.com/in/app/amply-aiborne/id6447426082' }
                    ]
                },
                { title: 'LMS Login', url: '#', variant: 'dark' },
                {
                    title: 'GreyT HR Login',
                    variant: 'dark',
                    tooltip: 'For credentials contact Tanmay',
                    subOptions: [
                        { title: 'Login', url: 'https://arcatron-hrms.greythr.com/uas/portal/auth/login?login_challenge=hR8XiyqiYBxENSQJYJzk1NNXROKeCb_W1CB3fgz4luTNhF_fMbJBKTW9MrZYaYwtNLITIDLfbq_3IH-LNvvOy0skdNw-IkYYthE7RwB-MwyZHLG1dbA58GOdITScNn0cetk0pncqNovCLrg6G5_bXd3onboYpFt5giqaKY75_oCKxNj_c5zyU80Df1Tnllo-7HEv7j0OjIPAZtTM9iLI68ddJ_gEgQA9IEID1eC7Vb6y0dKiN5czu_-jnkozGVafSyX0gMuIK-SSLsm4r8hRKrlGiw_C2uK4rTH39v1cVGyVqGb02XuBMjgMYttRzrgtSAX4jKNE4dJwGzyTEZtkB9bxmf6GDWPXfu9kYYZJnwjXubiVI0j7YfEyYebsLef0QxnmT7HXGfEXsGbNErhxp2jp7w6EeryFgFqVC6IjpkfBhyg_yZh1pB3Nr5uqfXd02RmOSdXqobXvJ7t8ZJXdG3rcL_IIU9kHwXjshL2olyaMAyFQWLhLuBSNkI4oSNgVaydkI8eF1CnIlBGPgSvPtD7rATCA9bReNNf8Fe9s25QjCAFtD2chxjNPrHek4KH4vY1-DCcw_mTGeGX-p6L43shKmq3o_zsGgwAYJ7QzFpT4WC34s_dEyjx_40gIGsNMzo7xL8isNpOYFXTd2NRQamoxkn-Z7A5qoPpQMGY_stLx3nMFW8J7TQexIv_GYfE7fDGBta4vjQ7ZGhuH4_THJeA1MX-yFRwQJUUcGGm0nPb7_LrATZPfnY7NTPB77sD0rDVAaWlrvgUXk5kXaxrsi8pbUsisca1yl0SR7I3JZ2hKQrQnyrPvLFhEeC_jiMKFtmVAUVtYJujs-QmjVg9x7G3vru5iSYsmarM5UQnyxodf0LoRaUUDxhxEEOzjBRPgb0cEJnNamtCk96xDZTRvk_XHCI2mmMYcsUx_irBd3BrznylFQj_1WD46wM_q0JAloZElkpgg-PV69eYuTSA5Sr-33gS8FHuudyf5ponnLP4HG2lCXZaUdA52JOUukUAFGx5BJ0o4lo2u11lu6rdUNWwIQNA-lEiZIH0LNYYS_DIusY3ui5YNU0oFvbGuyAaa9OCtYtOli2NKKGC33rxLKcfpCv_dM23rlNx9Xs0dM3runRj9FpZ3Tb7On4TzLUMPLYFT7qDl6pOG628WXG21DiIXQo53u8ZSEk5NwlVVwndT_r-34FYsUU8miRZYLS1DtDHVdgmAAlmk17S6EO2tx7_DXMtdRK-5_3cPVWIn_sQxLoFU58Njo_aUTCASu1rTvGdsD7cMBQ6jgaPbLCPv7pvMDZqwA0z6EgBg-2-fSp6BnSBPxWQKTEGRlQkoAMktjK3TcNJfCGTxQB45p0AWFwo_Kc98uOcGVinj2X_XUVH1HbrQmcC8Blv0nlI%3D' }
                    ]
                },
                { title: 'Zoho CRM', url: 'https://crm.zoho.in/crm/org60041934242/tab/Potentials/custom-view/950096000002215201/list?filter_id=950096000003222760&page=1', variant: 'dark', tooltip: 'For credentials contact Rishab' },
            ],
        },
        {
            id: 'walk-in-lead-management',
            title: 'Walk In Lead Management',
            icon: 'users',
            accentColor: 'rose',
            links: [
                { title: 'Knowlarity IVR Login', url: '#', variant: 'dark', tooltip: 'For credentials contact Asma', isComingSoon: true },
                { title: 'Limechat CRM Login', url: '#', variant: 'dark', isComingSoon: true },
            ],
        },

        {
            id: 'analytics',
            title: 'Analytics',
            icon: 'chart',
            accentColor: 'dark',
            links: [
                { title: 'Store Level Analytics Dashboard', url: '#', variant: 'dark', isComingSoon: true },
            ],
        },
    ],
};

// ─── Retail Admin Sections ───
export const retailAdminData = {
    title: 'Retail Admin Operations',
    backRoute: '',
    sections: [
        {
            id: 'after-sales-support',
            title: 'After Sales Support',
            icon: 'ticket',
            accentColor: 'amber',
            links: [
                { title: 'Raise a Customer Success Ticket', url: '#', variant: 'dark', tooltip: 'POC : Shernyl | Redirects to Slack workflow' },
                { title: 'Request a GST Bill', url: '#', variant: 'dark', tooltip: 'POC : Shernyl' },
            ],
        },
        {
            id: 'crm-logins',
            title: 'CRM & Logins',
            icon: 'login',
            accentColor: 'emerald',
            links: [
                {
                    title: 'POS Login',
                    variant: 'dark',
                    tooltip: 'For credentials contact Arsh',
                    subOptions: [
                        { title: 'Mobility', url: '#' },
                        { title: 'Non-Mobility', url: '#' }
                    ]
                },
                {
                    title: 'Amply SOP Login',
                    variant: 'dark',
                    tooltip: 'For credentials contact Arsh',
                    subOptions: [
                        { title: 'Login Dashboard', url: '#' },
                        { title: 'Install Android', url: '#' },
                        { title: 'Install iOS', url: '#' }
                    ]
                },
                { title: 'LMS Login', url: '#', variant: 'dark' },
                {
                    title: 'GreyT HR Login',
                    variant: 'dark',
                    tooltip: 'For credentials contact Tanmay',
                    subOptions: [
                        { title: 'Login', url: '#' }
                    ]
                },
                { title: 'Zoho CRM', url: '#', variant: 'dark', tooltip: 'For credentials contact Rishab' },
                { title: 'Frido Internal Tech', url: '#', variant: 'dark' },
                { title: 'Wilyer CMS', url: '#', variant: 'dark' },
                { title: 'Razorpay Bill Me', url: '#', variant: 'dark' },
                { title: 'ES – Customer Facing', url: '#', variant: 'dark' },
            ],
        },
        {
            id: 'data-analytics',
            title: 'Data & Analytics',
            icon: 'chart',
            accentColor: 'dark',
            links: [
                { title: 'Store Level Analytics Dashboard', url: '#', variant: 'dark' },
                { title: 'Sales Performance Tracker', url: '#', variant: 'dark' },
            ],
        },
        {
            id: 'pre-booking',
            title: 'Pre Booking',
            icon: 'store',
            accentColor: 'emerald',
            links: [
                { title: 'Out of Stock / Prebooking Form', url: '#', variant: 'dark' },
                { title: 'Chair Waitlist', url: '#', variant: 'dark' },
            ],
        },
    ],
};

// ─── Business Analytics Categories ───
export const businessAnalyticsCategories = [
    {
        id: 'shopify-analytics',
        title: 'Shopify Dashboard',
        icon: 'store',
        accentColor: 'emerald',
        description: 'E-commerce performance and store analytics',
        links: [
            {
                title: 'Shopify Dashboard',
                variant: 'dark',
                subOptions: [
                    { title: 'Shopify Dashboard', url: 'https://analytics-dashboard-frontend-x2da.onrender.com/' }
                ]
            }
        ],
    },
    {
        id: 'product-ranking-dashboard',
        title: 'Product Ranking Dashboard',
        icon: 'chart',
        accentColor: 'purple',
        description: 'Product performance rankings and competitive analysis',
        links: [
            {
                title: 'Product Ranking',
                variant: 'dark',
                subOptions: [
                    { title: 'Product Ranking', url: 'https://app.powerbi.com/groups/db29aca0-aaea-4625-ade1-430eecbe06ae/reports/27899055-db8e-47f6-8e4b-8dcb3ee0be4e?ctid=7e5ccb3a-f189-4e3a-95b2-5cfcc0e30f90&pbi_source=linkShare&bookmarkGuid=49175725-8504-4fd2-8cb1-e62e4e8cecdc' }
                ]
            }
        ],
    },
    {
        id: 'lost-revenue-dashboard',
        title: 'Lost Revenue Dashboard',
        icon: 'chart',
        accentColor: 'amber',
        description: 'Revenue leakage insights and missed opportunity tracking',
        links: [
            {
                title: 'Lost Revenue Dashboard',
                variant: 'dark',
                subOptions: [
                    { title: 'Lost Revenue Dashboard', url: 'https://mridulsharma27.github.io/lost-revenue-dashboard/' }
                ]
            }
        ],
    },
    {
        id: 'fes-analytics',
        title: 'Frido Experience Store',
        icon: 'store',
        accentColor: 'blue',
        description: 'Retail stores and physical experience center metrics',
        links: [
            {
                title: 'Dashboard PB',
                variant: 'dark',
                subOptions: [
                    { title: 'FES - Retail Central', url: 'https://app.powerbi.com/groups/me/reports/c78d231e-d1f7-4929-ad97-94b18268bbfa/a2f9454d3ce364e35311?ctid=7e5ccb3a-f189-4e3a-95b2-5cfcc0e30f90&experience=power-bi' },
                    { title: 'FES - DWM', url: 'https://app.powerbi.com/groups/db29aca0-aaea-4625-ade1-430eecbe06ae/reports/e2c0af62-bb6c-4484-946f-8dfa2d152ba9/2e745da33ddec0054198?experience=power-bi' }
                ]
            },
            {
                title: 'Manual Slack',
                variant: 'dark',
                subOptions: [
                    { title: 'FES - DSR', url: 'https://myfrido.slack.com/archives/C0A6P3Z23TP' }
                ]
            }
        ],
    },
    {
        id: 'isd-analytics',
        title: 'Inside Sales Department (NM)',
        icon: 'sales',
        accentColor: 'indigo',
        description: 'Non-Mobility Inside Sales performance tracking',
        links: [
            {
                title: 'Dashboard PB',
                variant: 'dark',
                subOptions: [
                    { title: 'ISD NM India', url: 'https://app.powerbi.com/groups/me/reports/0984ce65-de9b-45f7-be27-63725fe3dbd4/a8003931256920724ade?ctid=7e5ccb3a-f189-4e3a-95b2-5cfcc0e30f90&experience=power-bi&bookmarkGuid=0e840b8d-047f-4e31-806d-8c6a7149a0d1' },
                    { title: 'ISD NM Middle East', url: 'https://app.powerbi.com/groups/me/reports/d8a7c2e4-b55b-40f5-9c90-164afe97b427/a0885f75825d8cc3c3da?ctid=7e5ccb3a-f189-4e3a-95b2-5cfcc0e30f90&experience=power-bi&bookmarkGuid=8bb4cc56-8205-4451-9a9d-3425531d1cbf' }
                ]
            },
            {
                title: 'Manual Slack',
                variant: 'dark',
                subOptions: [
                    { title: 'ISD NM India', url: 'https://myfrido.slack.com/archives/C086WCMMY7M' },
                    { title: 'ISD NM Dubai', url: 'https://myfrido.slack.com/archives/C088SNW3UP6' }
                ]
            }
        ],
    },
];



