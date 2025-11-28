import { useState, useEffect } from 'react';
import styles from './PrintLabelModal.module.css';
import { LuPrinter } from "react-icons/lu";
import { IoMdClose } from "react-icons/io";

const PrintLabelModal = ({ onClose, instance }) => {
    const [labelSize, setLabelSize] = useState('2.5x1'); // 2.5 inch x 1 inch
    const [barcodeData, setBarcodeData] = useState('');

    useEffect(() => {
        if (instance) {
            // Generate barcode data (using instance code as barcode)
            setBarcodeData(instance.instanceCode || '');
        }
    }, [instance]);

    const handlePrint = () => {
        const printWindow = window.open('', '_blank');
        const labelContent = generateLabelHTML();
        
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Instance Label</title>
                <style>
                    @page {
                        size: 2.5in 1in;
                        margin: 0;
                    }
                    body {
                        margin: 0;
                        padding: 1px;
                        font-family: Arial, sans-serif;
                        font-size: 10px;
                        width: 2.5in;
                        height: 1in;
                        box-sizing: border-box;
                    }
                    .label {
                        width: 100%;
                        height: 100%;
                        border: 1px solid #000;
                        display: flex;
                        flex-direction: row;
                        justify-content: space-between;
                        align-items: center;
                        padding: 2px;
                        box-sizing: border-box;
                    }
                    .leftSection {
                        display: flex;
                        flex-direction: column;
                        justify-content: center;
                        flex: 1;
                        padding-right: 4px;
                    }
                    .header {
                        text-align: left;
                        font-weight: bold;
                        font-size: 8px;
                        margin-bottom: 2px;
                    }
                    .info {
                        font-size: 7px;
                        line-height: 1.1;
                        margin: 1px 0;
                    }
                    .rightSection {
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        flex: 1;
                        padding-left: 4px;
                    }
                    .barcode {
                        text-align: center;
                        font-family: 'Courier New', monospace;
                        font-size: 8px;
                        letter-spacing: 0.5px;
                        margin: 2px 0;
                        padding: 1px;
                        background: #f0f0f0;
                        border: 1px solid #ccc;
                    }
                    .footer {
                        text-align: center;
                        font-size: 6px;
                        margin-top: 2px;
                    }
                </style>
            </head>
            <body>
                ${labelContent}
            </body>
            </html>
        `);
        
        printWindow.document.close();
        printWindow.focus();
        
        // Auto-print without showing dialog
        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 100);
    };

    const generateLabelHTML = () => {
        return `
            <div class="label">
                <div class="leftSection">
                    <div class="header">INSTANCE LABEL</div>
                    <div class="info">
                        <div><strong>Instance:</strong> ${instance?.instanceCode || 'N/A'}</div>
                        <div><strong>Sample:</strong> ${instance?.sampleCode || 'N/A'}</div>
                        <div><strong>Lot:</strong> ${instance?.lotNo || 'N/A'}</div>
                    </div>
                </div>
                <div class="rightSection">
                    <div class="barcode">
                        ${generateBarcodePattern(instance?.instanceCode || '')}
                    </div>
                    <div class="footer">
                        ${new Date().toLocaleDateString()}
                    </div>
                </div>
            </div>
        `;
    };

    const generateBarcodePattern = (code) => {
        // Simple barcode pattern using characters
        // This is a basic representation - for production, use a proper barcode library
        const pattern = code.split('').map(char => {
            const charCode = char.charCodeAt(0);
            return '█'.repeat((charCode % 5) + 1);
        }).join(' ');
        return pattern;
    };

    const generateBarcodeSVG = () => {
        // Generate a simple SVG barcode
        const code = instance?.instanceCode || '';
        const bars = code.split('').map((char, index) => {
            const height = ((char.charCodeAt(0) % 5) + 1) * 2;
            return `<rect x="${index * 2}" y="${10 - height}" width="1" height="${height}" fill="black"/>`;
        }).join('');
        
        return `
            <svg width="100" height="20" viewBox="0 0 100 20">
                ${bars}
            </svg>
        `;
    };

    if (!instance) return null;

    return (
        <div className={styles.printModalContainer}>
            <div className={styles.header}>
                <h2 className={styles.title}>Print Instance Label</h2>
                <button className={styles.closeBtn} onClick={onClose}>
                    <IoMdClose />
                </button>
            </div>

            <div className={styles.content}>
                <div className={styles.labelPreview}>
                    <div className={styles.label}>
                        <div className={styles.leftSection}>
                            <div className={styles.labelHeader}>INSTANCE LABEL</div>
                            <div className={styles.labelInfo}>
                                <div><strong>Instance:</strong> {instance.instanceCode}</div>
                                <div><strong>Sample:</strong> {instance.sampleCode}</div>
                                <div><strong>Lot:</strong> {instance.lotNo}</div>
                            </div>
                        </div>
                        <div className={styles.rightSection}>
                            <div className={styles.barcode}>
                                {generateBarcodePattern(instance.instanceCode)}
                            </div>
                            <div className={styles.labelFooter}>
                                {new Date().toLocaleDateString()}
                            </div>
                        </div>
                    </div>
                </div>

                <div className={styles.settings}>
                    <div className={styles.settingGroup}>
                        <label>Label Size:</label>
                        <select 
                            value={labelSize} 
                            onChange={(e) => setLabelSize(e.target.value)}
                            className={styles.sizeSelect}
                        >
                            <option value="2.5x1">2.5" x 1" (Standard)</option>
                            <option value="2x1">2" x 1"</option>
                            <option value="3x1">3" x 1"</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className={styles.buttonGroup}>
                <button className={styles.printBtn} onClick={handlePrint}>
                    <LuPrinter /> Print Label
                </button>
                <button className={styles.cancelBtn} onClick={onClose}>
                    Cancel
                </button>
            </div>
        </div>
    );
};

export default PrintLabelModal;
