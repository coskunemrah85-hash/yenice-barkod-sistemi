
import React from 'react';
import { SaleItem } from '../types';

interface PrintableReceiptProps {
  saleItems: SaleItem[];
  total: number;
}

const PrintableReceipt: React.FC<PrintableReceiptProps> = ({ saleItems, total }) => {
  const date = new Date();
  const totalItems = saleItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <>
      <div id="printable-receipt">
        <div className="receipt-content">
          <h2>Yenice İç Giyim</h2>
          <p>Müşteri Bilgi Fişi</p>
          <div className="divider"></div>
          <p className="date-time">
            <span>Tarih: {date.toLocaleDateString('tr-TR')}</span>
            <span>Saat: {date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</span>
          </p>
          <div className="divider"></div>
          <table>
            <thead>
              <tr>
                <th>Ürün</th>
                <th className="qty">Adet</th>
                <th className="price">Fiyat</th>
              </tr>
            </thead>
            <tbody>
              {saleItems.map(item => (
                <tr key={item.barcode}>
                  <td>{item.name}</td>
                  <td className="qty">{item.quantity}</td>
                  <td className="price">{(item.price * item.quantity).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="divider"></div>
          <div className="summary">
            <p>
              <span>Toplam Ürün:</span>
              <span>{totalItems}</span>
            </p>
            <p className="total">
              <span>TOPLAM:</span>
              <span>{total.toFixed(2)} ₺</span>
            </p>
          </div>
          <div className="divider"></div>
          <p className="footer-text">Bizi tercih ettiğiniz için teşekkür ederiz.</p>
        </div>
      </div>
      <style type="text/css">
        {`
          @media screen {
            #printable-receipt {
              position: absolute;
              width: 1px;
              height: 1px;
              padding: 0;
              margin: -1px;
              overflow: hidden;
              clip: rect(0, 0, 0, 0);
              white-space: nowrap;
              border-width: 0;
            }
          }
          @media print {
            body * {
              visibility: hidden;
            }
            #printable-receipt, #printable-receipt * {
              visibility: visible;
            }
            #printable-receipt {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              height: auto;
              margin: 0;
              padding: 0;
              overflow: visible;
              clip: auto;
              white-space: normal;
            }
            .receipt-content {
              font-family: 'Courier New', Courier, monospace;
              width: 280px; /* Standard thermal printer width */
              margin: 0 auto;
              font-size: 12px;
              color: #000;
            }
            h2 {
              text-align: center;
              font-size: 16px;
              font-weight: bold;
              margin: 0 0 5px 0;
            }
            p {
              margin: 0;
              line-height: 1.4;
            }
            .receipt-content > p {
              text-align: center;
              font-size: 12px;
              margin-bottom: 5px;
            }
            .divider {
              border-top: 1px dashed #000;
              margin: 8px 0;
            }
            .date-time {
              display: flex;
              justify-content: space-between;
              font-size: 11px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
            }
            th, td {
              text-align: left;
              padding: 2px 0;
            }
            th {
              border-bottom: 1px solid #000;
              font-weight: bold;
            }
            .qty {
              text-align: center;
              width: 40px;
            }
            .price {
              text-align: right;
              width: 70px;
            }
            .summary p {
              display: flex;
              justify-content: space-between;
            }
            .summary .total {
              font-weight: bold;
              font-size: 14px;
              margin-top: 5px;
            }
            .footer-text {
              text-align: center;
              margin-top: 10px;
              font-size: 11px;
            }
          }
        `}
      </style>
    </>
  );
};

export default PrintableReceipt;
