import WhiteIsland from '../../../components/Whiteisland';
import styles from './ShippingDetails.module.css';
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FaSave, FaTrash, FaBarcode } from 'react-icons/fa';
import { TfiAlignJustify } from "react-icons/tfi";
import Modal from '../../../components/Modal';
import SampleForm from '../../../components/modals/SampleModal';
import SampleSelect from '../../../components/modals/SampleSelect'
import InstanceList from '../../../components/modals/InstanceListModal';
import toast from 'react-hot-toast';
import SignatureCanvas from 'react-signature-canvas';

export default function ShipmentDetails() {
    const { id } = useParams();
    const navigate = useNavigate();

    //Current Log's data state
    const [log, setLog] = useState({
        shippingCode: '',
        projectID: '',
        projectDesc: '',
        shipmentOrigin: '',
        shipmentDestination: '',
        logisticsProvider: '',
        note: '',
        shipmentDate: '',
        estimatedArrivalDate: '',
        status: 'Pending',
        image: ''
    });

    //Sample items state
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [projects, setProjects] = useState([]);
    const [projectsLoading, setProjectsLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                // Load projects for dropdown
                try {
                    const projRes = await fetch('http://localhost:5174/api/projects');
                    if (projRes.ok) {
                        const projData = await projRes.json();
                        setProjects(projData || []);
                    }
                } catch (projError) {
                    console.error('Error loading projects:', projError);
                } finally {
                    setProjectsLoading(false);
                }

                if (id && id !== 'add') {
                    try {
                        const res = await fetch(`http://localhost:5174/api/shipping/${id}`);
                        if (!res.ok) throw new Error('Failed to fetch shipping');
                        const data = await res.json();
                        setLog({
                            shippingCode: data.shippingCode || '',
                            projectID: data.projectID || '',
                            projectDesc: data.projectDesc || '',
                            shipmentOrigin: data.shipmentOrigin || '',
                            shipmentDestination: data.shipmentDestination || '',
                            logisticsProvider: data.logisticsProvider || '',
                            note: data.note || '',
                            shipmentDate: data.shipmentDate ? new Date(data.shipmentDate).toISOString().slice(0,10) : '',
                            estimatedArrivalDate: data.estimatedArrivalDate ? new Date(data.estimatedArrivalDate).toISOString().slice(0,10) : '',
                            status: data.status || 'Pending',
                            image: data.image || ''
                        });
                        
                        const linesRes = await fetch(`http://localhost:5174/api/shipping/${id}/lines`);
                        if (linesRes.ok) {
                            const lines = await linesRes.json();
                            setItems(lines.map(l => ({
                                _id: l._id,
                                id: l.sampleId,
                                sampleCode: l.sampleCode,
                                description: l.description,
                                lot: l.lot || '',
                                quantity: l.quantity || 0
                            })));
                        }
                    } catch (fetchError) {
                        console.error('Error loading shipping data:', fetchError);
                        toast.error('Failed to load shipping data');
                    }
                } else {
                    setItems([]);
                }
            } catch (e) {
                console.error('General error in load function:', e);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [id]);

    const onProjectChange = async (e) => {
        const selectedId = e.target.value;
        const selected = projects.find(p => (p._id === selectedId) || (p.projectID === selectedId));
        const next = { ...log, projectID: selectedId };
        if (selected) {
            next.projectDesc = selected.description || '';
            if (selected.bPartnerID) {
                try {
                    const bpRes = await fetch(`http://localhost:5174/api/bpartners/${selected.bPartnerID}`);
                    if (bpRes.ok) {
                        const bp = await bpRes.json();
                        next.shipmentOrigin = bp.name || next.shipmentOrigin;
                    }
                } catch (_) {}
            }
        }
        setLog(next);
    };

    const sigCanvas = useRef(null);
    const scanInputRef = useRef(null);
    const [signatureData, setSignatureData] = useState({
        signature: null
    });

    useEffect(() => {
        if (!sigCanvas.current || typeof sigCanvas.current.clear !== 'function') return;
        if (log.image) {
            try {
                sigCanvas.current.fromDataURL(log.image);
                setSignatureData({ signature: log.image });
            } catch (error) {
                console.error('Failed to load saved signature:', error);
            }
        } else {
            sigCanvas.current.clear();
            setSignatureData({ signature: null });
        }
    }, [log.image]);

    // Sample modals state (list + form)
    const [sampleModalState, setSampleModalState] = useState({
        showList: false,
        showForm: false,
        selectedSample: null
    });

    // Instance modal state (open/close)
    const [instanceModal, setInstanceModal] = useState({
        isOpen: false,
        selectedSample: null
    });

    const buildInitialScanState = () => ({
        isOpen: false,
        scannedCodes: [],
        pendingCode: '',
        statusMessage: '',
        isSubmitting: false,
        missingCodes: []
    });

    const [scanModalState, setScanModalState] = useState(buildInitialScanState);

    useEffect(() => {
        if (scanModalState.isOpen) {
            const timer = setTimeout(() => {
                scanInputRef.current?.focus();
            }, 50);
            return () => clearTimeout(timer);
        }
    }, [scanModalState.isOpen]);

    useEffect(() => {
        if (!scanModalState.isOpen) return;

        const handleGlobalKeydown = () => {
            if (
                scanInputRef.current &&
                document.activeElement !== scanInputRef.current &&
                !scanModalState.isSubmitting
            ) {
                scanInputRef.current.focus();
            }
        };

        document.addEventListener('keydown', handleGlobalKeydown, true);
        return () => document.removeEventListener('keydown', handleGlobalKeydown, true);
    }, [scanModalState.isOpen, scanModalState.isSubmitting]);

    const normalizeCode = (code = '') => code.trim().toUpperCase();

    //Modal Functions
    // Sample modal functions
    const openSampleList = () => {
        setSampleModalState({
            showList: true,
            showForm: false,
            selectedSample: null
        });
    };

    const openSampleForm = (sample = null) => {
        setSampleModalState({
            showList: false,
            showForm: true,
            selectedSample: sample
        });
    };

    const cancelSampleForm = () => {
        setSampleModalState({
            showList: true,
            showForm: false,
            selectedSample: null
        });
    };

    const closeAllSampleModals = () => {
        setSampleModalState({
            showList: false,
            showForm: false,
            selectedSample: null
        });
    };

    // Instance modal functions
    const openInstanceModal = (shippingLineItem) => {
        // Check if lot number is empty
        if (!shippingLineItem.lot || shippingLineItem.lot.trim() === '') {
            alert('Please enter a lot number for this shipping line before opening the instance modal.');
            return;
        }
        
        setInstanceModal({
            isOpen: true,
            selectedSample: shippingLineItem,
            receivingLine: shippingLineItem // Using receivingLine prop name for compatibility with InstanceListModal
        });
    };

    const closeInstanceModal = () => {
        setInstanceModal({
            isOpen: false,
            selectedSample: null,
            receivingLine: null
        });
    };
    //End Modal Functions

    const openScanModal = () => {
        if (!id || id === 'add') {
            toast.error('Please save this shipping record before scanning samples.');
            return;
        }
        setScanModalState({
            ...buildInitialScanState(),
            isOpen: true
        });
    };

    const closeScanModal = () => {
        setScanModalState(buildInitialScanState());
    };

    const handleCloseScanModal = () => {
        if (scanModalState.isSubmitting) return;
        closeScanModal();
    };

    const handleScanInputChange = (value) => {
        setScanModalState(prev => ({
            ...prev,
            pendingCode: value,
            statusMessage: ''
        }));
    };

    const queueScannedCode = (rawCode) => {
        setScanModalState(prev => {
            const value = normalizeCode(rawCode ?? prev.pendingCode);
            if (!value) {
                return {
                    ...prev,
                    statusMessage: 'Scan a barcode to add it to the queue.'
                };
            }

            const alreadyInShipment = items.some(item => normalizeCode(item.sampleCode || item.id || '') === value);
            if (alreadyInShipment) {
                toast.error(`Sample ${value} is already part of this shipment.`);
                return { ...prev, pendingCode: '', statusMessage: '' };
            }

            if (prev.scannedCodes.includes(value)) {
                return {
                    ...prev,
                    pendingCode: '',
                    statusMessage: `Sample ${value} is already queued.`
                };
            }

            return {
                ...prev,
                scannedCodes: [...prev.scannedCodes, value],
                pendingCode: '',
                statusMessage: '',
                missingCodes: prev.missingCodes.filter(code => code !== value)
            };
        });
    };

    const handleScanKeyDown = (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            queueScannedCode(event.target.value);
        }
    };

    const removeQueuedCode = (codeToRemove) => {
        setScanModalState(prev => ({
            ...prev,
            scannedCodes: prev.scannedCodes.filter(code => code !== codeToRemove)
        }));
    };

    const clearQueuedCodes = () => {
        setScanModalState(prev => ({
            ...prev,
            scannedCodes: []
        }));
    };

    const handleApplyScannedCodes = async () => {
        const uniqueCodes = Array.from(new Set(scanModalState.scannedCodes));
        if (uniqueCodes.length === 0) {
            setScanModalState(prev => ({
                ...prev,
                statusMessage: 'Scan at least one barcode before continuing.'
            }));
            return;
        }

        const existingCodes = new Set(items.map(item => normalizeCode(item.sampleCode || item.id || '')));
        const codesToAdd = uniqueCodes.filter(code => !existingCodes.has(code));

        if (codesToAdd.length === 0) {
            toast('All scanned samples are already in this shipment.');
            closeScanModal();
            return;
        }

        setScanModalState(prev => ({
            ...prev,
            isSubmitting: true,
            statusMessage: '',
            missingCodes: []
        }));

        try {
            const res = await fetch('http://localhost:5174/api/samples');
            if (!res.ok) throw new Error('Failed to load sample catalog.');

            const samples = await res.json();
            const sampleMap = new Map(
                (samples || [])
                    .filter(sample => sample?.sampleCode)
                    .map(sample => [normalizeCode(sample.sampleCode), sample])
            );

            const missingCodes = [];
            const samplesToAdd = [];
            codesToAdd.forEach(code => {
                const sample = sampleMap.get(code);
                if (!sample) {
                    missingCodes.push(code);
                } else {
                    samplesToAdd.push(sample);
                }
            });

            if (!samplesToAdd.length) {
                setScanModalState(prev => ({
                    ...prev,
                    isSubmitting: false,
                    missingCodes,
                    statusMessage: missingCodes.length
                        ? `No matches found for: ${missingCodes.join(', ')}`
                        : 'No scanned samples could be matched.'
                }));
                toast.error('No matching samples found for the scanned barcodes.');
                return;
            }

            const createdLines = [];
            for (const sample of samplesToAdd) {
                const response = await fetch(`http://localhost:5174/api/shipping/${id}/lines`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        sampleId: sample._id,
                        sampleCode: sample.sampleCode,
                        description: sample.description || sample.name || sample.formData?.sampleDescription || sample.sampleCode,
                        lot: '',
                        quantity: 1
                    })
                });

                if (!response.ok) {
                    throw new Error('Failed to add one or more samples to the shipment.');
                }

                const line = await response.json();
                createdLines.push({
                    _id: line._id,
                    id: line.sampleId,
                    sampleCode: line.sampleCode || sample.sampleCode,
                    description: line.description || sample.description || sample.name || '',
                    lot: line.lot || '',
                    quantity: line.quantity ?? 1
                });
            }

            setItems(prev => [...prev, ...createdLines]);

            if (missingCodes.length) {
                toast.error(`No match for: ${missingCodes.join(', ')}`);
            }
            toast.success(`Added ${createdLines.length} scanned sample${createdLines.length > 1 ? 's' : ''}.`);
            closeScanModal();
        } catch (error) {
            console.error(error);
            toast.error(error.message || 'Failed to add scanned samples.');
            setScanModalState(prev => ({
                ...prev,
                isSubmitting: false,
                statusMessage: error.message || 'Failed to add scanned samples.'
            }));
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setLog(prev => ({ ...prev, [name]: value }));
    };

    const handleLineItemChange = async (lineId, field, value) => {
        try {
            // Update local state first
            setItems(prev => prev.map(item => 
                (item._id === lineId || item.id === lineId) 
                    ? { ...item, [field]: value }
                    : item
            ));

            // Update on server
            const res = await fetch(`http://localhost:5174/api/shipping/lines/${lineId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ [field]: value })
            });
            if (!res.ok) throw new Error('Failed to update line item');
        } catch (e) {
            console.error(e);
            toast.error('Failed to update line item');
        }
    };

    const handleDeleteLineItem = async (lineId) => {
        if (!window.confirm('Are you sure you want to delete this line item?')) return;
        
        try {
            const res = await fetch(`http://localhost:5174/api/shipping/lines/${lineId}`, {
                method: 'DELETE'
            });
            if (!res.ok) throw new Error('Failed to delete line item');
            
            // Remove from local state
            setItems(prev => prev.filter(item => item._id !== lineId && item.id !== lineId));
            toast.success('Line item deleted');
        } catch (e) {
            console.error(e);
            toast.error('Failed to delete line item');
        }
    };

    const handleSave = async () => {
        try {
            const payload = {
                ...log,
                shipmentDate: log.shipmentDate ? new Date(log.shipmentDate) : undefined,
                estimatedArrivalDate: log.estimatedArrivalDate ? new Date(log.estimatedArrivalDate) : undefined,
                estDate: log.estimatedArrivalDate ? new Date(log.estimatedArrivalDate) : undefined,
            };

            let res;
            if (id && id !== 'add') {
                // Update existing
                res = await fetch(`http://localhost:5174/api/shipping/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
            } else {
                // Create new
                res = await fetch(`http://localhost:5174/api/shipping`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
            }

            if (!res.ok) throw new Error('Failed to save');
            const savedData = await res.json();
            
            toast.success("Details Saved!", {
                style: {
                    background: "rgba(69, 182, 120, 1)",
                    color: "#fff",
                },
                iconTheme: {
                    primary: '#FFFAEE',
                    secondary: 'rgba(69, 182, 120, 1)',
                },
            });

            // If creating new, navigate to the new ID
            if (id === 'add' && savedData._id) {
                navigate(`/ShippingLog/${savedData._id}`);
            }
        } catch (e) {
            console.error(e);
            toast.error('Failed to save shipping details');
        }
    };

    const handleDelete = async () => {
        if (!window.confirm('Are you sure you want to delete this shipping record?')) return;
        
        try {
            const res = await fetch(`http://localhost:5174/api/shipping/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed to delete');
            
            toast.error('Log deleted successfully!', {
                style: {
                    background: "rgb(220, 38, 38)",
                    color: "#fff",
                },
                iconTheme: {
                    primary: '#FFFAEE',
                    secondary: 'rgb(220, 38, 38)',
                },
            });
            navigate('/ShippingLog');
        } catch (e) {
            console.error(e);
            toast.error('Failed to delete shipping record');
        }
    };

    //signature buttons
    const saveSignature = async () => {
        if (!sigCanvas.current || sigCanvas.current.isEmpty()) {
            toast.error("Please provide a signature first.");
            return;
        }
        const dataURL = sigCanvas.current.toDataURL('image/png');
        setSignatureData({ signature: dataURL });
        setLog(prev => ({ ...prev, image: dataURL }));

        if (id && id !== 'add') {
            try {
                const res = await fetch(`http://localhost:5174/api/shipping/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ image: dataURL })
                });
                if (!res.ok) throw new Error('Failed to save signature');
                toast.success("Signature saved!");
            } catch (error) {
                console.error('Error saving signature:', error);
                toast.error("Failed to save signature. Please try again.");
            }
        } else {
            toast.success("Signature captured. Save the shipment to persist.");
        }
    }
    //clear signature
    const clearSignature = async () => {
        if (sigCanvas.current?.clear) {
            sigCanvas.current.clear();
        }
        setSignatureData({ signature: null });
        setLog(prev => ({ ...prev, image: '' }));

        if (id && id !== 'add') {
            try {
                const res = await fetch(`http://localhost:5174/api/shipping/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ image: '' })
                });
                if (!res.ok) throw new Error('Failed to clear signature');
                toast.success("Signature cleared.");
            } catch (error) {
                console.error('Error clearing signature:', error);
                toast.error("Failed to clear signature on server.");
            }
        }
    }

    return (
        <div className={styles.pageContainer}>
            <h2 className={styles.bHeading}>Shipping Details</h2>
            <WhiteIsland className={styles.bigIsland}>
                <h3>Shipping : {log.shippingCode || (id && id !== 'add' ? id : '(unsaved)')}</h3>
                <div className={styles.main}>
                    <div className={styles.detailContainer}>
                        <div className={styles.details}>
                            <div className={styles.info} style={{ width: '25%' }}>
                                <div className={styles.infoDetail}>Project</div>
                                <select name='projectID' value={log.projectID} onChange={onProjectChange}>
                                    <option value=''>Select project...</option>
                                    {projectsLoading ? (
                                        <option value='' disabled>Loading...</option>
                                    ) : (
                                        projects.map(p => (
                                            <option key={p._id} value={p._id}>{p.name || p.projectID}</option>
                                        ))
                                    )}
                                </select>
                            </div>
                            <div className={styles.info} style={{ width: '100%' }}>
                                <div className={styles.infoDetail}>Project Description</div>
                                <input name='projectDesc' value={log.projectDesc} onChange={handleChange}></input>
                            </div>
                        </div>
                        <div className={styles.details2}>
                            <div className={styles.info2} style={{ width: '35%' }}>
                                <div className={styles.infoDetail}>Origin</div>
                                <input name='shipmentOrigin' value={log.shipmentOrigin} onChange={handleChange}></input>
                            </div>
                            <div className={styles.info2} style={{ width: '35%' }}>
                                <div className={styles.infoDetail}>Destination</div>
                                <input name='shipmentDestination' value={log.shipmentDestination} onChange={handleChange}></input>
                            </div>
                            <div className={styles.info2} style={{ width: '35%' }}>
                                <div className={styles.infoDetail}>Logistics Provider</div>
                                <input name='logisticsProvider' value={log.logisticsProvider} onChange={handleChange}></input>
                            </div>
                        </div>
                        <div className={styles.details3}>
                            <div className={styles.info} style={{ width: '25%' }}>
                                <div className={styles.infoDetail}>Shipment Date</div>
                                <input type='date' name='shipmentDate' value={log.shipmentDate} onChange={handleChange}></input>
                            </div>
                            <div className={styles.info} style={{ width: '25%' }}>
                                <div className={styles.infoDetail}>Est. Arrival</div>
                                <input type='date' name='estimatedArrivalDate' value={log.estimatedArrivalDate} onChange={handleChange}></input>
                            </div>
                            <div className={styles.info} style={{ width: '25%' }}>
                                <div className={styles.infoDetail}>Status</div>
                                <select name='status' value={log.status} onChange={handleChange}>
                                    <option value='Pending'>Pending</option>
                                    <option value='Shipped'>Shipped</option>
                                    <option value='Delivered'>Delivered</option>
                                    <option value='Cancelled'>Cancelled</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
                <div className={styles.saves}>
                    {id && id !== 'add' && (
                        <button className={styles.deleteButton} onClick={handleDelete}><FaTrash />Delete </button>
                    )}
                    <button className={styles.saveButton} onClick={handleSave}><FaSave />Save </button>
                </div>
            </WhiteIsland>

            {/* Sample information WhiteIsland */}
            <WhiteIsland className={styles.bigIsland}>
                <div className={styles.headings}>
                    <h3 style={{ border: 'none' }}>Sample Information</h3>
                    <div className={styles.tableActions}>
                        {id && id !== 'add' && (
                            <>
                                <button className={styles.addButton} onClick={openSampleList}>
                                    + Add
                                </button>
                                <button className={`${styles.addButton} ${styles.scanButton}`} onClick={openScanModal}>
                                    <FaBarcode /> Scan
                                </button>
                            </>
                        )}
                    </div>
                </div>
                <div className={styles.main}>
                    <div className={styles.detailContainer}>
                        <div className={styles.tableContainer}>
                            <table className={styles.itemsTable}>
                                <thead>
                                    <tr>
                                        <th>Sample ID</th>
                                        <th>Sample Description</th>
                                        <th>Lot</th>
                                        <th>Quantity</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr><td colSpan="5" style={{textAlign:'center',padding:'10px'}}>Loading...</td></tr>
                                    ) : items.length === 0 ? (
                                        <tr><td colSpan="5" style={{textAlign:'center',padding:'10px'}}>No items. Click "Add" to add samples.</td></tr>
                                    ) : items.map((item) => (
                                        <tr key={item._id || item.id}>
                                            <td>{item.sampleCode || item.id}</td>
                                            <td>{item.description}</td>
                                            <td>
                                                <input 
                                                    type="text" 
                                                    value={item.lot || ''} 
                                                    onChange={(e) => handleLineItemChange(item._id || item.id, 'lot', e.target.value)}
                                                    className={styles.tableInput}
                                                    style={{
                                                        borderColor: (!item.lot || item.lot.trim() === '') ? '#ef4444' : '#D0D5DD'
                                                    }}
                                                    placeholder="Enter lot number"
                                                />
                                            </td>
                                            <td>
                                                <input 
                                                    type="number" 
                                                    value={item.quantity || ''} 
                                                    onChange={(e) => handleLineItemChange(item._id || item.id, 'quantity', parseInt(e.target.value) || 0)}
                                                    className={styles.tableInput}
                                                />
                                            </td>
                                            <td>
                                                <div style={{display: 'flex', gap: '8px', alignItems: 'center'}}>
                                                    <button
                                                        className={styles.addButton}
                                                        onClick={() => openInstanceModal(item)}
                                                        style={{
                                                            padding: '4px 8px', 
                                                            fontSize: '12px',
                                                            opacity: (!item.lot || item.lot.trim() === '') ? 0.5 : 1,
                                                            cursor: (!item.lot || item.lot.trim() === '') ? 'not-allowed' : 'pointer'
                                                        }}
                                                        disabled={!item.lot || item.lot.trim() === ''}
                                                        title={(!item.lot || item.lot.trim() === '') ? 'Please enter a lot number first' : 'Open instance modal'}
                                                    >
                                                        <TfiAlignJustify />
                                                    </button>
                                                    {id && id !== 'add' && (
                                                        <button
                                                            className={styles.deleteButton}
                                                            onClick={() => handleDeleteLineItem(item._id || item.id)}
                                                            style={{padding: '4px 8px', fontSize: '12px'}}>
                                                            <FaTrash />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </WhiteIsland>

            {/* Notes and Signature WhiteIsland */}
            <WhiteIsland className={styles.bigIsland}>
                <h3>Notes</h3>
                <div className={styles.main}>
                    <div className={styles.detailContainer}>
                        <div className={styles.notesSignatureContainer}>
                            <div className={styles.notesSection}>
                                <textarea
                                    className={styles.notesTextarea}
                                    name="note"
                                    value={log.note}
                                    onChange={handleChange}
                                    placeholder="Enter notes about this shipment..."
                                />
                            </div>
                            <div className={styles.signatureSection}>
                                <div className={styles.signatureField}>
                                    <div className={styles.infoDetail}>Completed By</div>
                                    <input
                                        className={styles.signatureInput}
                                        defaultValue="Michael R Groendyk"
                                    />
                                </div>
                                <div className={styles.signatureField}>
                                    <div className={styles.infoDetail}>Signature</div>
                                    <div className={styles.signatureBox}>
                                        <SignatureCanvas
                                            ref={sigCanvas}
                                            canvasProps={{
                                                className: styles.signatureImage,
                                                width: "1200",
                                                height: "100"
                                            }}
                                            backgroundColor="#f0f0f0"
                                        />
                                    </div>
                                    <div className={styles.signatureActions}>
                                        <button type="button" onClick={clearSignature} className={styles.smallBtn}>Clear</button>
                                        <button type="button" onClick={saveSignature} className={styles.smallBtn}>Save</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </WhiteIsland>

            {/* Sample List Modal */}
            {sampleModalState.showList && id && id !== 'add' && (
                <Modal onClose={closeAllSampleModals}>
                    <SampleSelect
                        onClose={closeAllSampleModals}
                        onOpenSampleForm={openSampleForm}
                        items={items}
                        onSelectSample={async (sample) => {
                            // Add shipping line for selected sample
                            try {
                                const res = await fetch(`http://localhost:5174/api/shipping/${id}/lines`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                        sampleId: sample._id,
                                        sampleCode: sample.sampleCode,
                                        description: sample.description || '',
                                        lot: '', // Start with empty lot
                                        quantity: 1 // Start with default quantity
                                    })
                                });
                                if (!res.ok) throw new Error('Failed to add line');
                                const line = await res.json();
                                setItems(prev => [...prev, {
                                    _id: line._id,
                                    id: line.sampleId,
                                    sampleCode: line.sampleCode || sample.sampleCode,
                                    description: line.description,
                                    lot: '', // Start with empty lot
                                    quantity: 1 // Start with default quantity
                                }]);
                                closeAllSampleModals();
                                toast.success('Sample added to shipping');
                            } catch (e) {
                                console.error(e);
                                toast.error('Failed to add sample');
                            }
                        }}
                    />
                </Modal>
            )}

            {/* Sample Form Modal */}
            {sampleModalState.showForm && (
                <Modal onClose={closeAllSampleModals}>
                    <SampleForm
                        onClose={cancelSampleForm}
                        sample={sampleModalState.selectedSample}
                    />
                </Modal>
            )}

            {/* Instance Modal */}
            {instanceModal.isOpen && (
                <Modal onClose={closeInstanceModal}>
                    <InstanceList
                        onClose={closeInstanceModal}
                        sample={instanceModal.selectedSample}
                        receivingLine={instanceModal.receivingLine}
                    />
                </Modal>
            )}

            {scanModalState.isOpen && (
                <Modal onClose={handleCloseScanModal}>
                    <div className={styles.scanModal}>
                        <h2>Scan Samples</h2>
                        <p className={styles.scanHelp}>
                            Focus the field below and scan each barcode. Most hardware scanners submit with the Enter key.
                        </p>
                        <label className={styles.scanLabel} htmlFor="scanInput">
                            Barcode
                        </label>
                        <div className={styles.scanInputRow}>
                            <input
                                id="scanInput"
                                ref={scanInputRef}
                                type="text"
                                className={styles.scanInput}
                                value={scanModalState.pendingCode}
                                onChange={(e) => handleScanInputChange(e.target.value)}
                                onKeyDown={handleScanKeyDown}
                                disabled={scanModalState.isSubmitting}
                                placeholder="Ready to scan..."
                                autoComplete="off"
                            />
                            <button
                                type="button"
                                className={styles.queueScanButton}
                                onClick={() => queueScannedCode()}
                                disabled={scanModalState.isSubmitting}
                            >
                                Queue
                            </button>
                        </div>
                        {scanModalState.statusMessage && (
                            <p className={styles.scanStatus}>{scanModalState.statusMessage}</p>
                        )}
                        {scanModalState.missingCodes?.length > 0 && (
                            <div className={styles.scanMissingNotice}>
                                Could not find: {scanModalState.missingCodes.join(', ')}
                            </div>
                        )}

                        <div className={styles.scanListSection}>
                            <div className={styles.scanListHeader}>
                                <span>Queued scans ({scanModalState.scannedCodes.length})</span>
                                {scanModalState.scannedCodes.length > 0 && (
                                    <button
                                        type="button"
                                        className={styles.clearScanButton}
                                        onClick={clearQueuedCodes}
                                        disabled={scanModalState.isSubmitting}
                                    >
                                        Clear
                                    </button>
                                )}
                            </div>
                            {scanModalState.scannedCodes.length === 0 ? (
                                <div className={styles.scanListEmpty}>
                                    No scans yet. Each successful scan will appear here.
                                </div>
                            ) : (
                                <ul className={styles.scanList}>
                                    {scanModalState.scannedCodes.map(code => (
                                        <li key={code} className={styles.scanListItem}>
                                            <span>{code}</span>
                                            <button
                                                type="button"
                                                onClick={() => removeQueuedCode(code)}
                                                disabled={scanModalState.isSubmitting}
                                            >
                                                Remove
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>

                        <div className={styles.scanActions}>
                            <button
                                type="button"
                                className={styles.scanCancelBtn}
                                onClick={handleCloseScanModal}
                                disabled={scanModalState.isSubmitting}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className={styles.scanSubmitBtn}
                                onClick={handleApplyScannedCodes}
                                disabled={scanModalState.isSubmitting}
                            >
                                {scanModalState.isSubmitting ? 'Adding...' : 'Add to Shipment'}
                            </button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    )
}
