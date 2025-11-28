import { useEffect, useState, useCallback } from 'react';
import styles from './InstanceListModal.module.css';
import { FaPlus} from 'react-icons/fa';
import { LuPrinter } from "react-icons/lu";
import JsBarcode from 'jsbarcode';

const InstanceList = ({ onClose, sample, receivingLine }) => {
    const [instances, setInstances] = useState([]);
    const [loading, setLoading] = useState(true);
    

    useEffect(() => {
        const load = async () => {
            try {
                const res = await fetch('http://localhost:5174/api/instances');
                if (res.ok) {
                    const data = await res.json();
                    console.log('All instances from backend:', data);
                    console.log('Sample data for filtering:', sample);
                    console.log('Looking for sampleCode:', sample?.sampleCode || sample?.id);
                    
                    const filtered = data.filter(i => 
                        i.sampleCode === (sample?.sampleCode || sample?.id) ||
                        i.idSample === (sample?._id || sample?.id)
                    );
                    console.log('Filtered instances:', filtered);
                    setInstances(filtered);
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [sample, receivingLine]);

    const createInstancesForSample = useCallback(async () => {
        try {
            const qty = Number(receivingLine?.quantity || 0);
            alert(`Creating ${qty} instances for sample: ${sample?.sampleCode || sample?.id}`);
            if (qty <= 0) {
                alert('Please set a quantity greater than 0 for this receiving line');
                return;
            }

            // Check if backend is reachable
            try {
                const testRes = await fetch('http://localhost:5174/api/instances');
                if (!testRes.ok) {
                    alert('Backend server is not responding. Please make sure the backend is running on port 5174.');
                    return;
                }
            } catch (backendError) {
                alert('Cannot connect to backend server. Please make sure the backend is running on port 5174.');
                console.error('Backend connection error:', backendError);
                return;
            }

            const now = new Date();
            const yy = now.getFullYear().toString().slice(-2);
            const mm = (now.getMonth() + 1).toString().padStart(2, '0');
            const dd = now.getDate().toString().padStart(2, '0');
            const dateStr = yy + mm + dd;

            // Get partner code from receiving line or sample
            const partnerCode = receivingLine?.bPartnerCode || sample?.bPartnerCode || '0000';
            const partnerSuffix = partnerCode.slice(-4).padStart(4, '0');

            // Find existing instances for this partner/date to get next serial
            const existingRes = await fetch('http://localhost:5174/api/instances');
            const allInstances = await existingRes.json();
            const existingForPartner = allInstances.filter(i => 
                i.instanceCode && i.instanceCode.startsWith(`IN-${dateStr}-${partnerSuffix}-`)
            );
            
            let startSerial = 1;
            if (existingForPartner.length > 0) {
                const lastCode = existingForPartner.sort((a, b) => 
                    parseInt(b.instanceCode.split('-')[3]) - parseInt(a.instanceCode.split('-')[3])
                )[0].instanceCode;
                startSerial = parseInt(lastCode.split('-')[3]) + 1;
            }

            // Create instances
            const creations = Array.from({ length: qty }).map(async (_, idx) => {
                const instanceCode = `IN-${dateStr}-${partnerSuffix}-${startSerial + idx}`;
                console.log(`Creating instance ${idx + 1}/${qty}: ${instanceCode}`);
                
                const instanceData = {
                    instanceCode,
                    idSample: sample?._id || sample?.id || null,
                    sampleCode: sample?.sampleCode || sample?.id || 'UNKNOWN-SAMPLE',
                    lotNo: receivingLine?.lot || 'DEFAULT-LOT',
                    status: 'Pending'
                };
                
                console.log('Instance data:', instanceData);
                
                const res = await fetch('http://localhost:5174/api/instances', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(instanceData)
                });
                
                if (!res.ok) {
                    const errorText = await res.text();
                    console.error(`Failed to create instance ${instanceCode}:`, res.status, errorText);
                    throw new Error(`Failed to create instance: ${res.status} ${errorText}`);
                }
                
                const result = await res.json();
                console.log(`Successfully created instance:`, result);
                return result;
            });

            console.log('Starting to create instances...');
            const created = await Promise.all(creations);
            console.log('All instances created:', created);
            
            // Refresh the instances list
            const refreshRes = await fetch('http://localhost:5174/api/instances');
            if (refreshRes.ok) {
                const allInstances = await refreshRes.json();
                const filtered = allInstances.filter(i => 
                    i.sampleCode === (sample?.sampleCode || sample?.id) ||
                    i.idSample === (sample?._id || sample?.id)
                );
                setInstances(filtered);
                console.log('Refreshed instances:', filtered);
            }
            
            alert(`Successfully created ${created.length} instances!`);
        } catch (e) {
            console.error('Error creating instances:', e);
        }
    }, [receivingLine, sample]);

    // Auto-create instances if none exist
    useEffect(() => {
        const autoCreate = async () => {
            console.log('Auto-create check:', {
                instancesLength: instances.length,
                quantity: receivingLine?.quantity,
                loading: loading
            });
            if (instances.length === 0 && receivingLine?.quantity > 0 && !loading) {
                console.log('Auto-creating instances...');
                await createInstancesForSample();
            }
        };
        autoCreate();
    }, [instances.length, receivingLine?.quantity, loading, createInstancesForSample]);

    const handlePrintLabel = (instance) => {
        const printWindow = window.open('', '_blank');
        const labelContent = generateLabelHTML(instance);
        
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
                        margin: 2px 0;
                        padding: 1px;
                        background: #f0f0f0;
                        border: 1px solid #ccc;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                    }
                    .barcode img {
                        max-width: 100%;
                        height: auto;
                        image-rendering: pixelated;
                        image-rendering: -moz-crisp-edges;
                        image-rendering: crisp-edges;
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

    const generateLabelHTML = (instance) => {
        const generateBarcodeSVG = (code) => {
            try {
                // Create a canvas element to generate the barcode
                const canvas = document.createElement('canvas');
                JsBarcode(canvas, code, {
                    format: "CODE128",
                    width: 1,
                    height: 20,
                    displayValue: false,
                    margin: 0
                });
                
                // Convert canvas to data URL
                const dataURL = canvas.toDataURL('image/png');
                return `<img src="${dataURL}" style="width: 60px; height: 20px; image-rendering: pixelated;" alt="Barcode" />`;
            } catch (error) {
                console.error('Barcode generation error:', error);
                // Fallback to text pattern if barcode generation fails
                const pattern = code.split('').map(char => {
                    const charCode = char.charCodeAt(0);
                    return '█'.repeat((charCode % 5) + 1);
                }).join(' ');
                return `<div style="font-family: monospace; font-size: 8px;">${pattern}</div>`;
            }
        };

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
                        ${generateBarcodeSVG(instance?.instanceCode || '')}
                    </div>
                    <div class="footer">
                        ${new Date().toLocaleDateString()}
                    </div>
                </div>
            </div>
        `;
    };

    return (
        <div className={styles.instanceModalContainer}>
            <div className={styles.header}>
                <h2 className={styles.title}>Sample Instances for {sample?.sampleCode || sample?.id || 'Sample'}</h2>
            </div>

            <div className={styles.content}>
                <div className={styles.tableContainer}>
                    <table className={styles.instanceTable}>
                        <thead>
                            <tr>
                                <th>Instance ID</th>
                                <th>Lot</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="4" style={{textAlign:'center',padding:'10px'}}>Loading...</td></tr>
                            ) : instances.map((instance) => (
                                <tr key={instance._id}>
                                    <td>{instance.instanceCode}</td>
                                    <td>{instance.lotNo}</td>
                                    <td>
                                        <span className={`${styles.statusBadge} ${styles[instance.status.toLowerCase().replace(' ', '')]}`}>
                                            {instance.status}
                                        </span>
                                    </td>
                                    <td>
                                        <div className={styles.actionButtons}>
                                            <button className={styles.printBtn} onClick={() => handlePrintLabel(instance)}>
                                                <LuPrinter /> Print 
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className={styles.buttonGroup}>
                <button className={styles.addButton} onClick={createInstancesForSample}>
                    <FaPlus /> Add Instance(s)
                </button>
                <button className={styles.closeBtn} onClick={onClose}>
                    Close
                </button>
            </div>
        </div>
    );
};

export default InstanceList;