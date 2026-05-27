export const generateBranchCode = (name: string, providedCode?: string): string => {
    if (providedCode) return providedCode.toUpperCase().replace(/[^A-Z0-9]/g, '');
    
    // Generate a code from the name + timestamp suffix to ensure uniqueness
    const baseCode = name ? name.substring(0, 4).toUpperCase().replace(/[^A-Z0-9]/g, '') : 'BRCH';
    const timestamp = Date.now().toString().slice(-4);
    return `${baseCode}${timestamp}`;
};
