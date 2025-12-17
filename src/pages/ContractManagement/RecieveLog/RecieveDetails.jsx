import WhiteIsland from '../../../components/Whiteisland';
import styles from './RecieveDetails.module.css';
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FaSave, FaPlus, FaTrash } from 'react-icons/fa';
import { TfiAlignJustify } from "react-icons/tfi";
import Modal from '../../../components/Modal';
import SampleForm from '../../../components/modals/SampleModal';
import SampleSelect from '../../../components/modals/SampleSelect'
import InstanceList from '../../../components/modals/InstanceListModal';
import toast from '../../../components/Toaster/toast';
import SignatureCanvas from 'react-signature-canvas';

export default function RecieveDetails() {
    const { id } = useParams();
    const navigate = useNavigate();

    //Current LOg's data state
    const [log, setLog] = useState({
        receivingCode: '',
        projectId: '',
        origin: '',
        destination: '',
        tracking: '',
        projectDesc: '',
        shippedDate: '',
        arrivedDate: '',
        estArrival: '',
        signatureImage: ''
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
                    const projRes = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/projects`);
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
                        const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/receivings/${id}`);
                        if (!res.ok) throw new Error('Failed to fetch receiving');
                        const data = await res.json();
                        setLog({
                            receivingCode: data.receivingCode || '',
                            projectId: data.projectId || '',
                            origin: data.origin || '',
                            destination: data.destination || '',
                            tracking: data.tracking || '',
                            projectDesc: data.projectDesc || '',
                            shippedDate: data.shippedDate ? new Date(data.shippedDate).toISOString().slice(0,10) : '',
                            arrivedDate: data.arrivedDate ? new Date(data.arrivedDate).toISOString().slice(0,10) : '',
                            estArrival: data.estArrival ? new Date(data.estArrival).toISOString().slice(0,10) : '',
                            signatureImage: data.signatureImage || ''
                        });
                        
                        const linesRes = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/receivings/${id}/lines`);
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
                        console.error('Error loading receiving data:', fetchError);
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
        const next = { ...log, projectId: selectedId };
        if (selected) {
            next.projectDesc = selected.description || '';
            if (selected.bPartnerID) {
                try {
                    const bpRes = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/bpartners/${selected.bPartnerID}`);
                    if (bpRes.ok) {
                        const bp = await bpRes.json();
                        next.origin = bp.name || next.origin;
                    }
                } catch (_) {}
            }
        }
        setLog(next);
    };

    const sigCanvas = useRef(null);
    const [signatureData, setSignatureData] = useState({
        signature: null
    });

    useEffect(() => {
        if (!sigCanvas.current || typeof sigCanvas.current.clear !== 'function') return;
        if (log.signatureImage) {
            try {
                sigCanvas.current.fromDataURL(log.signatureImage);
                setSignatureData({ signature: log.signatureImage });
            } catch (error) {
                console.error('Failed to load saved signature:', error);
            }
        } else {
            sigCanvas.current.clear();
            setSignatureData({ signature: null });
        }
    }, [log.signatureImage]);


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



//Modal FUnctions
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
    const openInstanceModal = (receivingLineItem) => {
        // Check if lot number is empty
        if (!receivingLineItem.lot || receivingLineItem.lot.trim() === '') {
            alert('Please enter a lot number for this receiving line before opening the instance modal.');
            return;
        }
        
        setInstanceModal({
            isOpen: true,
            selectedSample: receivingLineItem,
            receivingLine: receivingLineItem
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
            const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/receivings/lines/${lineId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ [field]: value })
            });
            if (!res.ok) throw new Error('Failed to update line item');
        } catch (e) {
            console.error(e);
        }
    };

    const handleDeleteLineItem = async (lineId) => {
        if (!window.confirm('Are you sure you want to delete this line item?')) return;
        
        try {
            const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/receivings/lines/${lineId}`, {
                method: 'DELETE'
            });
            if (!res.ok) throw new Error('Failed to delete line item');
            
            // Remove from local state
            setItems(prev => prev.filter(item => item._id !== lineId && item.id !== lineId));
        } catch (e) {
            console.error(e);
        }
    };
    const handleSave = async () => {
        toast.success("Details Saved!");
        try {
            const payload = {
                ...log,
                shippedDate: log.shippedDate ? new Date(log.shippedDate) : undefined,
                arrivedDate: log.arrivedDate ? new Date(log.arrivedDate) : undefined,
                estArrival: log.estArrival ? new Date(log.estArrival) : undefined,
            };
            const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/receivings/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!res.ok) throw new Error('Failed to save');
        } catch (e) {
            console.error(e);
        }
    }
    const handleDelete = async () => {
        toast.warning('Log deleted successfully!');
        try {
            const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/receivings/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed to delete');
            navigate('/RecieveLog');
        } catch (e) {
            console.error(e);
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
        setLog(prev => ({ ...prev, signatureImage: dataURL }));

        if (id && id !== 'add') {
            try {
                const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/receivings/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ signatureImage: dataURL })
                });
                if (!res.ok) throw new Error('Failed to save signature');
                toast.success("Signature saved!");
            } catch (error) {
                console.error('Error saving signature:', error);
                toast.error("Failed to save signature. Please try again.");
            }
        } else {
            toast.success("Signature captured. Save the receiving log to persist.");
        }
    }
    //clear signature
    const clearSignature = async () => {
        if (sigCanvas.current?.clear) {
            sigCanvas.current.clear();
        }
        setSignatureData({ signature: null });
        setLog(prev => ({ ...prev, signatureImage: '' }));

        if (id && id !== 'add') {
            try {
                const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/receivings/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ signatureImage: '' })
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
            <h2 className={styles.bHeading}>Recieving Details</h2>
            <WhiteIsland className={styles.bigIsland}>
                    <h3>Receiving : {log.receivingCode || '(unsaved)'}</h3>
                <div className={styles.main}>
                    <div className={styles.detailContainer}>
                        <div className={styles.details}>
                            <div className={styles.info} style={{ width: '25%' }}>
                                <div className={styles.infoDetail}>Project</div>
                                <select name='projectId' value={log.projectId} onChange={onProjectChange}>
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
                            <div className={styles.info} style={{ width: '100%' }}><div className={styles.infoDetail}>Project Description</div>        <input name='projectDesc' value={log.projectDesc} onChange={handleChange}></input></div>
                        </div>
                        <div className={styles.details2}>
                            <div className={styles.info2} style={{ width: '35%' }}><div className={styles.infoDetail}>Origin</div>  <input name='origin' value={log.origin} onChange={handleChange}></input></div>
                            <div className={styles.info2} style={{ width: '35%' }}><div className={styles.infoDetail}>Destination</div>            <input name='destination' value={log.destination} onChange={handleChange}></input></div>
                            <div className={styles.info2} style={{ width: '35%' }}><div className={styles.infoDetail}>Tracking</div>          <input name='tracking' value={log.tracking} onChange={handleChange}></input></div>
                        </div>
                        <div className={styles.details3}>
                            <div className={styles.info} style={{ width: '25%' }}><div className={styles.infoDetail}>Shipped</div>    <input type='date' name='shippedDate' value={log.shippedDate} onChange={handleChange}></input></div>
                            <div className={styles.info} style={{ width: '25%' }}><div className={styles.infoDetail}>Arrived</div>     <input type='date' name='arrivedDate' value={log.arrivedDate} onChange={handleChange}></input></div>
                            <div className={styles.info} style={{ width: '25%' }}><div className={styles.infoDetail}>Est. Arrival</div>      <input type='date' name='estArrival' value={log.estArrival} onChange={handleChange}></input></div>
                            <div className={styles.info} style={{ width: '25%' }}><div className={styles.infoDetail}>Duration</div>       <input type='text' name='duration' value={log.duration} onChange={handleChange}></input></div>
                        </div>
                    </div>
                </div>
                <div className={styles.saves}>
                    <button className={styles.deleteButton} onClick={handleDelete}><FaTrash />Delete </button>
                    <button className={styles.saveButton} onClick={handleSave}><FaSave />Save </button>
                </div>
            </WhiteIsland>


            {/* Sample information WhiteIsland */}
            <WhiteIsland className={styles.bigIsland}>
                <div className={styles.headings}>
                    <h3 style={{ border: 'none' }}>Sample Information</h3>
                    <div className={styles.tableActions}>
                        <button className={styles.addButton} onClick={openSampleList}>
                            + Add
                        </button>
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
                                                    <button
                                                        className={styles.deleteButton}
                                                        onClick={() => handleDeleteLineItem(item._id || item.id)}
                                                        style={{padding: '4px 8px', fontSize: '12px'}}>
                                                        <FaTrash />
                                                    </button>
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
                                    placeholder="Enter notes about this shipment..."
                                    defaultValue="Eakin Healthcare Samples shipped from Element to Groenakker in 17 large overpacked boxes."
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
            {sampleModalState.showList && (
                <Modal onClose={closeAllSampleModals}>
                    <SampleSelect
                        onClose={closeAllSampleModals}
                        onOpenSampleForm={openSampleForm}
                        items={items}
                        onSelectSample={async (sample) => {
                            // Add receiving line for selected sample
                            try {
                                const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/receivings/${id}/lines`, {
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
                            } catch (e) {
                                console.error(e);
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
        </div>
    )
}