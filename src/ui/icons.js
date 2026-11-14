const icons = {
    orbit: '<ellipse cx="12" cy="12" rx="10" ry="5" transform="rotate(-35 12 12)"/><circle cx="12" cy="12" r="3"/>',
    rocket: '<path d="M14 5c3-3 6-3 6-3s0 3-3 6l-6 6-5-5 8-4Z"/><path d="m6 9-3 1-1 5 6-1m3 0-1 6 5-1 1-6M5 17l-2 4 4-2"/><circle cx="15" cy="7" r="1"/>',
    chip: '<rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 2v4m6-4v4M9 18v4m6-4v4M2 9h4m-4 6h4m12-6h4m-4 6h4"/>',
    payload:
        '<rect x="5" y="7" width="14" height="14" rx="2"/><path d="M9 7V4h6v3M9 12h6m-6 4h6"/>',
    arrow: '<path d="M5 12h14m-5-5 5 5-5 5"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    close: '<path d="m6 6 12 12M6 18 18 6"/>',
    save: '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h12l4 4v12a2 2 0 0 1-2 2Z"/><path d="M7 3v6h10V3M7 21v-8h10v8"/>',
    chart: '<path d="M4 3v17h17M8 15v-4m5 4V7m5 8V4"/>',
    sound: '<path d="m11 5-6 4H2v6h3l6 4V5Zm4 3a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 8a2.5 2.5 0 1 1 3 2.5c-.5.4-.5 1-.5 2M12 16h.01"/>',
    mass: '<path d="m4 20 3-13h10l3 13H4Z"/><path d="M9 7V5a3 3 0 0 1 6 0v2"/>',
    power: '<path d="m13 2-9 12h7l-1 8 10-12h-7l1-8Z"/>',
    data: '<path d="M4 5h16v14H4zM8 9h8M8 13h5"/>',
    comms: '<path d="M8 16a6 6 0 0 1 0-8m-3 11a10 10 0 0 1 0-14m11 11a6 6 0 0 0 0-8m3 11a10 10 0 0 0 0-14"/><circle cx="12" cy="12" r="2"/>',
    budget: '<circle cx="12" cy="12" r="9"/><path d="M15 8H10a2 2 0 0 0 0 4h4a2 2 0 0 1 0 4H9m3-11v14"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    reset: '<path d="M3 10a9 9 0 1 1 1 7M3 3v7h7"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1 1m12 12 1 1M5 19l1-1M18 6l1-1"/>',
    moon: '<path d="M20 14a9 9 0 0 1-10-11 9 9 0 1 0 10 11Z"/>',
    link: '<path d="m10 14 4-4M8 16l-1 1a4 4 0 0 1-6-6l4-4a4 4 0 0 1 6 0m2 1 1-1a4 4 0 0 1 6 6l-4 4a4 4 0 0 1-6 0"/>',
    chevron: '<path d="m6 9 6 6 6-6"/>',
    pause: '<path d="M8 5v14M16 5v14"/>',
    play: '<path d="m8 5 11 7-11 7V5Z"/>',
    flag: '<path d="M5 21V3m0 1c5-5 9 5 14 0v10c-5 5-9-5-14 0"/>',
    download: '<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
};

export const icon = (name, className = "") => {
    return `<svg class="icon ${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || icons.orbit}</svg>`;
};
