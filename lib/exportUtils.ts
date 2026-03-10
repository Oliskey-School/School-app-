// Export utilities for CSV and PDF generation

export const exportToCSV = (data: any[], filename: string, headers?: string[]) => {
    if (!data || data.length === 0) {
        alert('No data to export');
        return;
    }

    // Get headers from first object if not provided
    const csvHeaders = headers || Object.keys(data[0]);

    // Create CSV content
    const csvRows = [
        csvHeaders.join(','),
        ...data.map(row =>
            csvHeaders.map(header => {
                const value = row[header];
                // Handle values with commas, quotes, or newlines
                if (value === null || value === undefined) return '';
                const stringValue = String(value);
                if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
                    return `"${stringValue.replace(/"/g, '""')}"`;
                }
                return stringValue;
            }).join(',')
        )
    ];

    const csvContent = csvRows.join('\n');

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
};

export const exportToPDF = async (
    data: any[],
    filename: string,
    title: string,
    headers: string[],
    columns: string[]
) => {
    if (!data || data.length === 0) {
        alert('No data to export');
        return;
    }

    const { jsPDF } = await import('jspdf');
    await import('jspdf-autotable');

    const doc = new jsPDF();

    // Add title
    doc.setFontSize(18);
    doc.text(title, 14, 22);

    // Add date
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 30);

    // Prepare table data
    const tableData = data.map(row =>
        columns.map(col => {
            const value = row[col];
            if (value === null || value === undefined) return '';
            return String(value);
        })
    );

    // Add table
    (doc as any).autoTable({
        head: [headers],
        body: tableData,
        startY: 35,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [99, 102, 241] }, // Indigo
        alternateRowStyles: { fillColor: [245, 245, 245] }
    });

    // Save PDF
    doc.save(`${filename}_${new Date().toISOString().split('T')[0]}.pdf`);
};

export const formatCurrency = (value: number, currency: string = 'NGN') => {
    return new Intl.NumberFormat('en-NG', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 0
    }).format(value);
};

export const formatDate = (dateString: string, includeTime: boolean = false) => {
    const options: Intl.DateTimeFormatOptions = {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        ...(includeTime && {
            hour: '2-digit',
            minute: '2-digit'
        })
    };
    return new Date(dateString).toLocaleDateString('en-US', options);
};

export const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-US').format(value);
};

// Pagination utility
export const paginate = <T,>(items: T[], page: number, pageSize: number) => {
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return {
        items: items.slice(startIndex, endIndex),
        totalPages: Math.ceil(items.length / pageSize),
        currentPage: page,
        totalItems: items.length,
        hasNext: endIndex < items.length,
        hasPrev: page > 1
    };
};

// Debounce utility for search
export const debounce = <T extends (...args: any[]) => any>(
    func: T,
    wait: number
): ((...args: Parameters<T>) => void) => {
    let timeout: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
};

// Cache utility
class SimpleCache {
    private cache: Map<string, { data: any; timestamp: number }> = new Map();
    private ttl: number;

    constructor(ttlMinutes: number = 5) {
        this.ttl = ttlMinutes * 60 * 1000;
    }

    set(key: string, data: any) {
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
    }

    get(key: string): any | null {
        const cached = this.cache.get(key);
        if (!cached) return null;

        const isExpired = Date.now() - cached.timestamp > this.ttl;
        if (isExpired) {
            this.cache.delete(key);
            return null;
        }

        return cached.data;
    }

    clear() {
        this.cache.clear();
    }

    delete(key: string) {
        this.cache.delete(key);
    }
}

export const dataCache = new SimpleCache(5); // 5 minutes TTL
