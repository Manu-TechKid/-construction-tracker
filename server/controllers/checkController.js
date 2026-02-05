const Check = require('../models/Check');
const Vendor = require('../models/Vendor');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const pdf = require('html-pdf');

const escapeHtml = (str) => {
  if (str === undefined || str === null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

const formatMoney = (value) => {
  const n = Number(value || 0);
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const formatShortDate = (d) => {
  if (!d) return '';
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return '';
  return dt.toLocaleDateString('en-US');
};

const numberToWords = (n) => {
  const num = Number(n || 0);
  if (!Number.isFinite(num)) return '';
  if (num === 0) return 'Zero';

  const a = [
    '',
    'One',
    'Two',
    'Three',
    'Four',
    'Five',
    'Six',
    'Seven',
    'Eight',
    'Nine',
    'Ten',
    'Eleven',
    'Twelve',
    'Thirteen',
    'Fourteen',
    'Fifteen',
    'Sixteen',
    'Seventeen',
    'Eighteen',
    'Nineteen',
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const toWordsUnder1000 = (x) => {
    let res = '';
    const hundreds = Math.floor(x / 100);
    const rest = x % 100;
    if (hundreds) res += `${a[hundreds]} Hundred`;
    if (rest) {
      if (res) res += ' ';
      if (rest < 20) res += a[rest];
      else {
        const tens = Math.floor(rest / 10);
        const ones = rest % 10;
        res += b[tens];
        if (ones) res += ` ${a[ones]}`;
      }
    }
    return res;
  };

  const whole = Math.floor(num);
  const cents = Math.round((num - whole) * 100);

  const scales = [
    { value: 1000000000, label: 'Billion' },
    { value: 1000000, label: 'Million' },
    { value: 1000, label: 'Thousand' },
  ];

  let remaining = whole;
  let words = '';

  scales.forEach((s) => {
    const part = Math.floor(remaining / s.value);
    if (part) {
      if (words) words += ' ';
      words += `${toWordsUnder1000(part)} ${s.label}`;
      remaining = remaining % s.value;
    }
  });

  if (remaining) {
    if (words) words += ' ';
    words += toWordsUnder1000(remaining);
  }

  const centsStr = String(cents).padStart(2, '0');
  return `${words} and ${centsStr}/100`;
};

exports.getAllChecks = catchAsync(async (req, res, next) => {
  const { status, vendorId, startDate, endDate } = req.query;

  const filter = {};
  if (status) filter.status = status;
  if (vendorId) filter.vendor = vendorId;
  if (startDate || endDate) {
    filter.checkDate = {};
    if (startDate) filter.checkDate.$gte = new Date(startDate);
    if (endDate) filter.checkDate.$lte = new Date(endDate);
  }

  const checks = await Check.find(filter)
    .populate('vendor')
    .sort({ checkDate: -1, createdAt: -1 });

  res.status(200).json({
    status: 'success',
    results: checks.length,
    data: { checks },
  });
});

exports.getCheck = catchAsync(async (req, res, next) => {
  const check = await Check.findById(req.params.id)
    .populate('vendor')
    .populate('lineItems.invoice');

  if (!check) {
    return next(new AppError('Check not found', 404));
  }

  res.status(200).json({
    status: 'success',
    data: { check },
  });
});

exports.createCheck = catchAsync(async (req, res, next) => {
  const { vendor: vendorId } = req.body;

  const vendor = await Vendor.findById(vendorId);
  if (!vendor) {
    return next(new AppError('Vendor not found', 404));
  }

  const check = await Check.create({
    ...req.body,
    createdBy: req.user?._id,
    updatedBy: req.user?._id,
  });

  const populated = await Check.findById(check._id).populate('vendor');

  res.status(201).json({
    status: 'success',
    data: { check: populated },
  });
});

exports.updateCheck = catchAsync(async (req, res, next) => {
  const check = await Check.findByIdAndUpdate(
    req.params.id,
    { ...req.body, updatedBy: req.user?._id },
    { new: true, runValidators: true }
  ).populate('vendor');

  if (!check) {
    return next(new AppError('Check not found', 404));
  }

  res.status(200).json({
    status: 'success',
    data: { check },
  });
});

exports.deleteCheck = catchAsync(async (req, res, next) => {
  const check = await Check.findByIdAndUpdate(req.params.id, { deleted: true }, { new: true });

  if (!check) {
    return next(new AppError('Check not found', 404));
  }

  res.status(204).json({
    status: 'success',
    data: null,
  });
});

exports.voidCheck = catchAsync(async (req, res, next) => {
  const check = await Check.findByIdAndUpdate(
    req.params.id,
    { status: 'voided', updatedBy: req.user?._id },
    { new: true }
  ).populate('vendor');

  if (!check) {
    return next(new AppError('Check not found', 404));
  }

  res.status(200).json({
    status: 'success',
    data: { check },
  });
});

exports.markPrinted = catchAsync(async (req, res, next) => {
  const check = await Check.findById(req.params.id).populate('vendor');

  if (!check) {
    return next(new AppError('Check not found', 404));
  }

  check.status = 'printed';
  check.printedAt = new Date();
  check.printCount = Number(check.printCount || 0) + 1;
  check.updatedBy = req.user?._id;
  await check.save({ validateBeforeSave: false });

  res.status(200).json({
    status: 'success',
    data: { check },
  });
});

exports.generatePDF = catchAsync(async (req, res, next) => {
  const check = await Check.findById(req.params.id)
    .populate('vendor')
    .populate('lineItems.invoice');

  if (!check) {
    return next(new AppError('Check not found', 404));
  }

  const offsetX = Number(req.query.offsetX || 0);
  const offsetY = Number(req.query.offsetY || 0);

  const company = {
    name: 'DSJ Construction & Services LLC',
    address: '651 Pullman Pl',
    cityStateZip: 'Gaithersburg, MD 20877 USA',
    phone: '+1 (240) 877-3053',
    email: 'info@servicesdsj.com',
  };

  const vendor = check.vendor || {};

  const vendorAddress = [
    vendor.addressLine1,
    vendor.addressLine2,
    [vendor.city, vendor.state, vendor.zipCode].filter(Boolean).join(' '),
  ]
    .filter(Boolean)
    .join('<br>');

  const voucherRows = (check.lineItems || [])
    .map((li) => {
      const invNo = li.invoice?.invoiceNumber ? `Invoice ${li.invoice.invoiceNumber}` : '';
      const desc = [li.description, invNo].filter(Boolean).join(' - ');
      return `
        <tr>
          <td class="desc">${escapeHtml(desc)}</td>
          <td class="amt">$${escapeHtml(formatMoney(li.amount || 0))}</td>
        </tr>
      `;
    })
    .join('');

  const amountWords = numberToWords(check.amount);

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <style>
          * { box-sizing: border-box; }
          @page { size: Letter; margin: 0.4in; }
          body { margin: 0; font-family: Arial, Helvetica, sans-serif; color: #111; font-size: 10px; }

          .sheet { width: 100%; transform: translate(${offsetX}px, ${offsetY}px); }

          .row { display: table; width: 100%; table-layout: fixed; }
          .cell { display: table-cell; vertical-align: top; }

          .voucher { border: 1px solid #d0d7de; padding: 10px; border-radius: 4px; margin-bottom: 10px; }
          .voucher-title { font-weight: 800; font-size: 12px; color: #0b4aa2; margin-bottom: 6px; }

          .company { font-weight: 700; }
          .muted { color: #5f6b7a; }

          table { width: 100%; border-collapse: collapse; }
          .voucher-table { margin-top: 8px; border: 1px solid #e6edf5; }
          .voucher-table th { background: #243447; color: #fff; padding: 6px; text-align: left; font-size: 9px; }
          .voucher-table td { padding: 6px; border-top: 1px solid #eef2f7; }
          .voucher-table .amt { text-align: right; white-space: nowrap; width: 90px; }

          .check { border: 1px solid #d0d7de; padding: 10px; border-radius: 4px; height: 3.2in; }
          .check-top { display: table; width: 100%; table-layout: fixed; }
          .check-left { display: table-cell; width: 60%; vertical-align: top; }
          .check-right { display: table-cell; width: 40%; vertical-align: top; text-align: right; }

          .check-no { font-weight: 800; font-size: 11px; }
          .check-amt { font-weight: 900; font-size: 14px; }

          .field { margin-top: 6px; }
          .label { font-size: 8px; color: #5f6b7a; }
          .value { font-size: 10px; font-weight: 600; }

          .payto { margin-top: 10px; }
          .payto .value { font-size: 11px; }

          .amount-words { margin-top: 6px; font-size: 10px; }

          .memo { margin-top: 10px; }

          .check-footer { margin-top: 16px; font-size: 8px; color: #5f6b7a; }

          .hr { height: 1px; background: #e6edf5; margin: 8px 0; }
        </style>
      </head>
      <body>
        <div class="sheet">

          <div class="voucher">
            <div class="voucher-title">PAYMENT VOUCHER</div>
            <div class="row">
              <div class="cell">
                <div class="company">${escapeHtml(company.name)}</div>
                <div class="muted">${escapeHtml(company.address)}</div>
                <div class="muted">${escapeHtml(company.cityStateZip)}</div>
                <div class="muted">${escapeHtml(company.email)}</div>
              </div>
              <div class="cell" style="text-align:right;">
                <div><span class="label">CHECK #</span> <span class="value">${escapeHtml(check.checkNumber)}</span></div>
                <div><span class="label">DATE</span> <span class="value">${escapeHtml(formatShortDate(check.checkDate))}</span></div>
                <div><span class="label">AMOUNT</span> <span class="value">$${escapeHtml(formatMoney(check.amount))}</span></div>
              </div>
            </div>

            <div class="hr"></div>

            <div class="row">
              <div class="cell">
                <div class="label">PAYEE</div>
                <div class="value">${escapeHtml(vendor.name || '')}</div>
                <div class="muted">${vendorAddress}</div>
              </div>
              <div class="cell" style="text-align:right;">
                <div class="label">MEMO</div>
                <div class="value">${escapeHtml(check.memo || '')}</div>
              </div>
            </div>

            <table class="voucher-table">
              <thead>
                <tr>
                  <th>DESCRIPTION</th>
                  <th style="text-align:right;">AMOUNT</th>
                </tr>
              </thead>
              <tbody>
                ${voucherRows || `<tr><td class="desc">Payment</td><td class="amt">$${escapeHtml(formatMoney(check.amount))}</td></tr>`}
              </tbody>
            </table>
          </div>

          <div class="check">
            <div class="check-top">
              <div class="check-left">
                <div class="company">${escapeHtml(company.name)}</div>
                <div class="muted">${escapeHtml(company.address)} • ${escapeHtml(company.cityStateZip)}</div>
              </div>
              <div class="check-right">
                <div class="check-no">CHECK # ${escapeHtml(check.checkNumber)}</div>
                <div class="field"><span class="label">DATE</span> <span class="value">${escapeHtml(formatShortDate(check.checkDate))}</span></div>
                <div class="field"><span class="label">AMOUNT</span> <span class="check-amt">$${escapeHtml(formatMoney(check.amount))}</span></div>
              </div>
            </div>

            <div class="payto">
              <div class="label">PAY TO THE ORDER OF</div>
              <div class="value">${escapeHtml(vendor.name || '')}</div>
              <div class="muted">${vendorAddress}</div>
            </div>

            <div class="amount-words">${escapeHtml(amountWords)} Dollars</div>

            <div class="memo">
              <div class="label">MEMO</div>
              <div class="value">${escapeHtml(check.memo || '')}</div>
            </div>

            <div class="check-footer">Print calibration: offsetX=${escapeHtml(offsetX)} offsetY=${escapeHtml(offsetY)}</div>
          </div>

        </div>
      </body>
    </html>
  `;

  const options = {
    format: 'Letter',
    border: { top: '0.4in', right: '0.4in', bottom: '0.4in', left: '0.4in' },
  };

  pdf.create(htmlContent, options).toBuffer((err, buffer) => {
    if (err) {
      console.error('PDF Generation Error:', err);
      return next(new AppError('Could not generate check PDF', 500));
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=check-${check.checkNumber}.pdf`);
    res.send(buffer);
  });
});
