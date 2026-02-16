/**
 * Get current accounting year info
 * India Financial Year: April 1st to March 31st
 */
const getAccountingYearInfo = (date = new Date()) => {
    const month = date.getMonth();
    const year = date.getFullYear();
    const startYear = (month < 3) ? year - 1 : year;
    const endYear = startYear + 1;
    return {
        startYear,
        endYear,
        label: `${startYear.toString().slice(-2)}${endYear.toString().slice(-2)}`, // e.g., 2324
        displayLabel: `${startYear}-${endYear.toString().slice(-2)}`, // e.g., 2023-24
        fullLabel: `${startYear}-${endYear}`, // e.g., 2023-2024
        startDate: new Date(startYear, 3, 1), // April 1st
        endDate: new Date(endYear, 2, 31, 23, 59, 59) // March 31st
    };
};

module.exports = {
    getAccountingYearInfo
};
