export const generateBranchCode = (name?: string, providedCode?: string): string => {
    if (providedCode && typeof providedCode === 'string' && providedCode.trim() !== '') {
        return providedCode.toUpperCase().replace(/[^A-Z0-9]/g, '');
    }
    const base = name ? name.substring(0, 4).toUpperCase().replace(/[^A-Z0-9]/g, '') : 'BRCH';
    return `${base}${Math.floor(Math.random() * 1000)}`;
};
