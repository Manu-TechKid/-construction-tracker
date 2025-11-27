# Construction Tracker - Testing Guide

## Issues Addressed in This Release

### 1. Invoice Total Calculation Discrepancy ($300 Missing)
**Problem**: Invoice totals were showing $15,201 instead of $15,501 (missing $300)
**Root Cause**: Invoice totals were not being recalculated when retrieved from database
**Solution**: Added post-find hooks to recalculate totals from work orders on every retrieval

**Test Steps**:
1. Go to **Invoices** page
2. Filter by building "Mallory Square" and date range "Nov 01, 2025 - Nov 30, 2025"
3. Check the **Total** amount displayed at the top
4. Manually add up all invoice amounts in the list using calculator
5. **Expected**: Total shown should match manual calculation
6. **Verify**: No $300 or other discrepancies

### 2. Market House Invoice $50 Discrepancy
**Problem**: Market House invoices showing $50 calculation error
**Root Cause**: Same as above - totals not recalculated
**Solution**: Post-find hooks now ensure accurate totals

**Test Steps**:
1. Go to **Invoices** page
2. Filter by building "Market House" and date range "Jan 01, 2025 - Nov 26, 2025"
3. Check displayed total vs. manual calculation
4. **Expected**: All amounts should match exactly

### 3. Overdue Invoices Not Auto-Marked
**Problem**: Invoices past due date were not automatically marked as "overdue"
**Root Cause**: No automatic status update logic
**Solution**: Added pre-save hook and controller logic to auto-mark overdue invoices

**Test Steps**:
1. Go to **Invoices** page
2. Look for any invoices with **Due Date** in the past
3. Check their **Status** column
4. **Expected**: Status should show "overdue" (red chip)
5. **Verify**: If you see "open" or "sent" status on past-due invoices, the fix is working

### 4. Dashboard Alerts - Reminders and Calls
**Problem**: Need to verify reminders and calls appear correctly in Dashboard
**Solution**: DashboardAlerts component filters reminders and calls by due date

**Test Steps for Reminders**:
1. Go to **Reminders** page
2. Create a new reminder with:
   - **Title**: "Test Reminder Yesterday"
   - **Due Date**: Yesterday (e.g., Nov 25, 2025 if today is Nov 26)
   - **Priority**: High
3. Create another reminder with:
   - **Title**: "Test Reminder Today"
   - **Due Date**: Today (Nov 26, 2025)
   - **Priority**: High
4. Go to **Dashboard**
5. Look at **Today's Alerts** card
6. **Expected**: 
   - "Test Reminder Yesterday" should appear under "Reminders" with "1 overdue"
   - "Test Reminder Today" should appear with "1 today"
   - Both should show in red/orange color

**Test Steps for Calls**:
1. Go to **Calls** page
2. Create a new call log with:
   - **Building/Prospect**: Select any building
   - **Next Action Date**: Today or earlier (Nov 26, 2025 or earlier)
   - **Next Action Note**: "Follow-up needed"
3. Go to **Dashboard**
4. Look at **Today's Alerts** card
5. **Expected**: Call should appear under "Pending Call Follow-Ups" section

### 5. Dashboard Work Orders Count Discrepancy (November/Mallory)
**Problem**: Dashboard shows 33 work orders but manual count differs
**Root Cause**: Different date basis and week start logic
**Solution**: Verify filtering logic and week calculations

**Test Steps**:
1. Go to **Work Orders** page
2. Filter by:
   - **Building**: Mallory Square
   - **Date Range**: Nov 01, 2025 - Nov 30, 2025
   - **Status**: (leave blank for all statuses)
3. Count total work orders shown
4. Note this number as your "reference count"
5. Go to **Dashboard** → **Weekly Production**
6. Set time period to "Last 8 weeks" to include November
7. Find November weeks and sum up all work orders for Mallory Square
8. **Expected**: Dashboard count should match Work Orders filtered count
9. **Note**: Dashboard only shows "completed" work orders, so filter Work Orders by Status = "completed" for exact match

### 6. Email Notifications (Reminders and Schedule Changes)
**Status**: Feature not yet implemented
**Planned**: 
- Email notifications when reminders are created/due
- Email notifications when employee schedules change
- Manager emails configured in Building settings

**Current Workaround**: Manual email sending available in Invoices page

---

## Quick Test Checklist

- [ ] Invoice totals match manual calculation (Mallory Square Nov 2025)
- [ ] Market House invoices show correct totals
- [ ] Overdue invoices automatically marked as "overdue"
- [ ] Yesterday's reminder appears in Dashboard alerts
- [ ] Today's reminder appears in Dashboard alerts
- [ ] Today's or earlier call appears in Dashboard alerts
- [ ] Work Orders count matches Dashboard count (when filtered same way)

---

## How to Run Tests

### Backend Tests
```bash
npm test --prefix server
```

### Frontend Tests
```bash
npm test --prefix client
```

### Manual Testing
1. Start the server: `npm start --prefix server`
2. Start the client: `npm start --prefix client`
3. Follow test steps above in your browser

---

## Known Limitations

1. **Email Notifications**: Not yet implemented. Currently requires manual email sending.
2. **Dashboard Week Start**: Uses Monday as week start (ISO standard). Work Orders page can use different week start.
3. **Overdue Marking**: Only marks invoices as overdue when they're retrieved or saved. May not update in real-time if invoice is not accessed.

---

## Troubleshooting

### Invoice totals still don't match
- Clear browser cache and reload
- Verify work orders have correct price/cost fields
- Check that invoice.workOrders array is populated

### Reminders not appearing in Dashboard
- Verify reminder has a dueDate set
- Check reminder status is not "completed"
- Ensure dueDate is today or earlier for "Today's Alerts"

### Calls not appearing in Dashboard
- Verify call has nextAction.date set
- Check that nextAction.date is today or earlier
- Ensure call is not marked as completed

---

## Next Steps

1. Implement email notification service for reminders
2. Implement email notification service for schedule changes
3. Add email configuration to Building settings
4. Align Dashboard week start with Work Orders page (Sunday vs Monday)
5. Add real-time overdue invoice checking (background job)
