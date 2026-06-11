/** Google Sheet: Order Dispute tracker */

export const ORDER_DISPUTE_SPREADSHEET_ID =
    String(process.env.ORDER_DISPUTE_SPREADSHEET_ID ?? '1nxEvf7dl47paIL4fTr8yp4xA2YzCf6k29ydKouP1BA4').trim();

/**
 * Sheet tab gids from the spreadsheet URL (#gid=…).
 * Add the second tab gid when known; names are resolved at fetch time.
 */
export const ORDER_DISPUTE_SHEET_GIDS = [
    Number(process.env.ORDER_DISPUTE_SHEET_GID_1 ?? 1178023285),
    Number(process.env.ORDER_DISPUTE_SHEET_GID_2 ?? 0) || null,
].filter((gid) => Number.isFinite(gid) && gid > 0);
