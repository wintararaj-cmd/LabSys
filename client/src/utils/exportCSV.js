/**
 * exportToCSV - Exports an array of objects to a downloadable CSV file.
 * Pure JS, no dependencies.
 *
 * @param {string} filename   - Output filename (without extension)
 * @param {Array}  rows       - Array of plain objects (each key = column)
 * @param {Array}  [headers]  - Optional [{key, label}] array to control columns & order
 */
export function exportToCSV(filename, rows, headers) {
    if (!rows || rows.length === 0) return;

    let cols;
    if (headers) {
        cols = headers;
    } else {
        const keys = Object.keys(rows[0]);
        cols = keys.map(k => ({ key: k, label: k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) }));
    }

    const escape = (val) => {
        const str = val == null ? '' : String(val);
        // Wrap in quotes if it contains comma, newline, or quote
        return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
    };

    const header = cols.map(c => escape(c.label)).join(',');
    const body = rows.map(row => cols.map(c => escape(row[c.key])).join(',')).join('\n');
    const csv = `\uFEFF${header}\n${body}`; // BOM for Excel UTF-8 compat

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
}
