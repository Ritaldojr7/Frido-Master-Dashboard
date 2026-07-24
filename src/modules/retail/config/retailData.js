/**
 * Retail module — dashboard link trees.
 *
 * Owns the Retail Staff portal (`staff_experience_store`) and Retail Admin
 * (`retailAdminData`) section data. These are re-exported from
 * `src/config/dashboardData.js` for backward compatibility, but this module is
 * the source of truth.
 */

export const staffExperienceStoreData = {
    title: 'Retail Sales and Operations',
    backRoute: '', // No back route for staff since this is their homepage
    sections: [
        {
            id: 'after-sales-support',
            title: 'After Sales Support',
            icon: 'supportChat',
            accentColor: 'amber',
            links: [
                { title: 'Raise a Customer Success Ticket', url: 'https://myfrido.slack.com/archives/C0A59S3BYB1', variant: 'dark', tooltip: 'POC : Shernyl | Note: This link will redirect you to the slack channel where you can use the workflow to submit the form' },
                { title: 'Raise a GST Bill', url: 'https://form.asana.com/?k=aRlrsFCkrJRDTUdLHizQ1g&d=1207389811595677', variant: 'dark', tooltip: 'POC : Shernyl' },
                { title: 'Instore product exchange/Return sheet', url: 'https://docs.google.com/spreadsheets/d/1rWxMcoPRHeYZHagtlnEaOg43u0qwOjpdPtPDfuYBSE8/edit?gid=0#gid=0', variant: 'dark' },
            ],
        },
        {
            id: 'day-to-day-operations',
            title: 'Day to Day Operations',
            icon: 'opsClipboard',
            accentColor: 'blue',
            links: [
                { title: 'Raise Maintainence Ticket', url: 'https://form.asana.com/?k=T88A9GJZzo-RaSyJDacLYw&d=1207389811595677', variant: 'dark' },
                { title: 'Raise a Inventory Request', url: 'https://form.asana.com/?k=2mNtWIMKNygDDxCSPiYbNQ&d=1207389811595677', variant: 'dark' },
                { title: 'Raise a Reimbursement Request (New Joinees)', url: 'https://form.asana.com/?k=i-p9CI7ecwOX5u_8Hdz3tA&d=1207389811595677', variant: 'dark' },
                { title: 'QC Issues : Reverse Pickup', url: 'https://form.asana.com/?k=2mNtWIMKNygDDxCSPiYbNQ&d=1207389811595677', variant: 'dark' },
                { title: 'Retail Sales Assist App', url: 'https://retail-sales-assist-app-cbyx.onrender.com/sign-in', variant: 'dark' },
                { title: 'Raise a Prebooking Request', url: '#', variant: 'dark', isComingSoon: true },
            ],
        },
        {
            id: 'request-custom-product',
            title: 'Request Custom Product',
            icon: 'shoppingCart',
            accentColor: 'purple',
            links: [{ title: 'Request a Custom Insole', url: '#', variant: 'dark', isComingSoon: true }],
        },
        {
            id: 'crm-logins',
            title: 'CRM & Logins',
            icon: 'credentialsKey',
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
                { title: 'LMS Login', url: 'https://academy.myfrido.com/login', variant: 'dark' },
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
            icon: 'leadCapture',
            accentColor: 'rose',
            links: [
                { title: 'Knowlarity IVR Login', url: 'https://sr.knowlarity.com/', variant: 'dark', tooltip: 'For credentials contact Asma' },
                { title: 'Limechat CRM Login', url: 'https://lcdemo.limechat.ai/app/login', variant: 'dark' },
            ],
        },

        {
            id: 'products-brochure',
            title: 'Products Brochure',
            icon: 'document',
            accentColor: 'emerald',
            links: [
                {
                    title: 'All Products Brochure 2026',
                    url: '/retail-staff/all-products-brochure-2026.pdf',
                    variant: 'dark',
                    isPdf: true,
                },
            ],
        },

        {
            id: 'fes-cx-journey-guidelines',
            title: 'FES CX Journey Guidelines',
            icon: 'document',
            accentColor: 'blue',
            links: [
                {
                    title: 'CX Journey guidelines (PDF)',
                    url: '/retail-staff/fes-cx-journey-guidelines.pdf',
                    variant: 'dark',
                },
            ],
        },

        {
            id: 'analytics',
            title: 'Analytics',
            icon: 'analyticsPresentation',
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
            icon: 'supportChat',
            accentColor: 'amber',
            links: [
                { title: 'Customer Success Ticket Asana Project', url: 'https://app.asana.com/1/1207389811595677/project/1213316876312751/list', variant: 'dark' },
                { title: 'GST Bill Asana Project', url: 'https://app.asana.com/1/1207389811595677/project/1213316878589495/list', variant: 'dark' },
                { title: 'Maintenance Tracking Project-Asana', url: 'https://app.asana.com/1/1207389811595677/project/1213894531209883/list/1213894776502119', variant: 'dark' },
                { title: 'Instore product exchange/Return sheet', url: 'https://docs.google.com/spreadsheets/d/1rWxMcoPRHeYZHagtlnEaOg43u0qwOjpdPtPDfuYBSE8/edit?gid=0#gid=0', variant: 'dark' },
            ],
        },
        {
            id: 'crm-logins',
            title: 'CRM & Logins',
            icon: 'credentialsKey',
            accentColor: 'emerald',
            links: [
                {
                    title: 'POS Login',
                    variant: 'dark',
                    tooltip: 'For credentials contact Arsh',
                    subOptions: [
                        { title: 'DevX Admin Non-Mobility', url: 'https://frido-admin.devxcommerce.com/' },
                        { title: 'DevX Admin Mobility', url: 'https://posx-frido-mobility-admin.devxcommerce.com/login' }
                    ]
                },
                {
                    title: 'Amply SOP Login',
                    variant: 'dark',
                    tooltip: 'For credentials contact Arsh',
                    subOptions: [
                        { title: 'Dashboard Link', url: 'https://dashboard.getamply.co/login/?next=/amply/' },
                        { title: 'Android', url: 'https://play.google.com/store/apps/details?id=com.aiborne.amplyv1' },
                        { title: 'iOS', url: 'https://apps.apple.com/in/app/amply-aiborne/id6447426082' }
                    ]
                },
                { title: 'LMS Login', url: 'https://academy.myfrido.com/login', variant: 'dark' },
                { title: 'Zoho CRM', url: '#', variant: 'dark', tooltip: 'For credentials contact Rishab', isComingSoon: true },
                { title: 'Wilyer CMS', url: 'https://cms.wilyersignage.com/', variant: 'dark' },
                { title: 'Razorpay Bill Me', url: '#', variant: 'dark', isComingSoon: true },
            ],
        },
        {
            id: 'data-analytics',
            title: 'Data & Analytics',
            icon: 'analyticsPresentation',
            accentColor: 'dark',
            links: [
                { title: 'Store Level Analytics Dashboard', url: '#', variant: 'dark', isComingSoon: true },
                { title: 'Sales Performance Tracker', url: '#', variant: 'dark', isComingSoon: true },
            ],
        },
        {
            id: 'others',
            title: 'Others',
            icon: 'document',
            accentColor: 'blue',
            links: [
                { title: 'KRA/KPI sheet for retail', url: 'https://docs.google.com/spreadsheets/d/1Fjb9VPcg0uL5BhOzHcqu6d9j29HdTagaqo2wN-JfSyU/edit?usp=sharing', variant: 'dark' },
            ],
        },
    ],
};
