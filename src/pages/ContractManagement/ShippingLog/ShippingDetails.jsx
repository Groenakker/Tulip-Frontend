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
import toast from '../../../components/Toaster/toast';
import SignatureCanvas from 'react-signature-canvas';
import { useAuth } from '../../../context/AuthContext';  

export default function ShipmentDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    //Current Log's data state
    const [log, setLog] = useState({
        shippingCode: '',
        projectID: '',
        projectDesc: '',
        projectCode: '',
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

    //Instance data state
    const [instanceData, setInstanceData] = useState([]);
    const [selectedRowId, setSelectedRowId] = useState(null);

    //Handle instance toggle function
    const handleInstanceToggle = async (itemId) => {
        if (selectedRowId === itemId) {
            // If clicking the same row, close it
            setSelectedRowId(null);
            setInstanceData([]);
        } else {
            // Find the selected item
            const selectedItem = items.find(item => (item._id === itemId) || (item.id === itemId));
            
            if (selectedItem) {
                setSelectedRowId(itemId);
                
                // Get instances from the item's instances array
                const instances = selectedItem.instances || [];
                
                // If instances array exists and has data, use it directly
                if (Array.isArray(instances) && instances.length > 0) {
                    // Map instances to the format needed for the table
                    const mappedInstances = instances.map(instance => ({
                        instanceID: instance.instanceCode || instance.instanceId || '',
                        sampleID: instance.sampleCode || '',
                        lot: instance.lotNo || instance.lot || ''
                    }));
                    setInstanceData(mappedInstances);
                } else {
                    // If no instances in the item, try to fetch from the shipping line
                    try {
                        const lineId = selectedItem._id || selectedItem.id;
                        if (lineId && id && id !== 'add') {
                            const lineRes = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/shipping/lines/${lineId}`);
                            if (lineRes.ok) {
                                const lineData = await lineRes.json();
                                const lineInstances = lineData.instances || [];
                                
                                if (Array.isArray(lineInstances) && lineInstances.length > 0) {
                                    const mappedInstances = lineInstances.map(instance => ({
                                        instanceID: instance.instanceCode || instance.instanceId || '',
                                        sampleID: instance.sampleCode || '',
                                        lot: instance.lotNo || instance.lot || ''
                                    }));
                                    setInstanceData(mappedInstances);
                                } else {
                                    setInstanceData([]);
                                }
                            } else {
                                setInstanceData([]);
                            }
                        } else {
                            setInstanceData([]);
                        }
                    } catch (error) {
                        console.error('Error fetching instances for shipping line:', error);
                        setInstanceData([]);
                    }
                }
            } else {
                setSelectedRowId(itemId);
                setInstanceData([]);
            }
        }
    };

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
                        const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/shipping/${id}`);
                        if (!res.ok) throw new Error('Failed to fetch shipping');
                        const data = await res.json();
                        setLog({
                            shippingCode: data.shippingCode || '',
                            projectID: data.projectID || '',
                            projectDesc: data.projectDesc || '',
                            projectCode: data.projectCode || '',
                            shipmentOrigin: data.shipmentOrigin || '',
                            shipmentDestination: data.shipmentDestination || '',
                            logisticsProvider: data.logisticsProvider || '',
                            note: data.note || '',
                            shipmentDate: data.shipmentDate ? new Date(data.shipmentDate).toISOString().slice(0,10) : '',
                            estimatedArrivalDate: data.estimatedArrivalDate ? new Date(data.estimatedArrivalDate).toISOString().slice(0,10) : '',
                            status: data.status || 'Pending',
                            image: data.image || ''
                        });
                        
                        const linesRes = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/shipping/${id}/lines`);
                        if (linesRes.ok) {
                            const lines = await linesRes.json();
                            console.log('Loaded shipping lines:', lines);
                            setItems(lines.map(l => {
                                // Handle instances - could be array of objects or array of IDs
                                const instances = l.instances || [];
                                const instanceCount = Array.isArray(instances) ? instances.length : 0;
                                console.log(`Line ${l._id}: instances =`, instances, 'count =', instanceCount);
                                return {
                                    _id: l._id,
                                    id: l.sampleId,
                                    sampleCode: l.sampleCode,
                                    description: l.description,
                                    lot: l.lot || '',
                                    quantity: instanceCount > 0 ? instanceCount : (l.quantity || 0),
                                    instances: instances
                                };
                            }));
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
        const selectedValue = e.target.value;
        console.log('selectedValue from dropdown:', selectedValue);
        console.log('Available projects:', projects);
        
        // Find project by projectCode, projectID, or _id
        const selected = projects.find(p => 
            p.projectCode === selectedValue || 
            p.projectID === selectedValue ||
            p._id === selectedValue
        );
        
        console.log('Found project:', selected);
        
        const next = { ...log };
        
        if (selected) {
            // Set all three fields: projectCode, projectID, and projectDesc
            // If projectCode doesn't exist, use projectID as projectCode
            next.projectCode = selected.projectCode || selected.projectID || selectedValue || '';
            next.projectID = selected._id || selected.projectID || '';
            next.projectDesc = selected.description || selected.projectDesc || selected.name || '';
            
            console.log('Setting projectCode to:', next.projectCode);
            console.log('Setting projectID to:', next.projectID);
            console.log('Setting projectDesc to:', next.projectDesc);
            
            if (selected.bPartnerID) {
                try {
                    const bpRes = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/bpartners/${selected.bPartnerID}`);
                    if (bpRes.ok) {
                        const bp = await bpRes.json();
                        next.shipmentOrigin = bp.name || next.shipmentOrigin;
                    }
                } catch (_) {}
            }
        } else {
            // If no project selected, clear all fields
            next.projectCode = '';
            next.projectID = '';
            next.projectDesc = '';
        }
        
        setLog(next);
        console.log('log updated:', next);
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
        scannedCodes: [], // For display purposes
        scannedInstances: [], // Store full instance objects
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

    const queueScannedCode = async (rawCode) => {
        const value = normalizeCode(rawCode ?? scanModalState.pendingCode);
        if (!value) {
            setScanModalState(prev => ({
                ...prev,
                statusMessage: 'Scan a barcode to add it to the queue.'
            }));
            return;
        }
        console.log('value', value);

        // Search for the instance directly from the database by instance code
        try {
            // Try to fetch the specific instance by code using query parameter
            const instanceRes = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/instances/instance-code/${encodeURIComponent(value)}`);
            if (!instanceRes.ok) {
                throw new Error('Failed to search instance in database.');
            }
            
            const instances = await instanceRes.json();
            console.log('instanceRes', instances);
            // Handle both array response and single object response
            // If backend returns all instances (query param not supported), filter by code
            let foundInstance = null;
            if (Array.isArray(instances)) {
                foundInstance = instances.find(instance => 
                    instance?.instanceCode && normalizeCode(instance.instanceCode) === value
                );
            } else if (instances && instances.instanceCode) {
                foundInstance = normalizeCode(instances.instanceCode) === value ? instances : null;
            }

            if (!foundInstance) {
                setScanModalState(prev => ({
                    ...prev,
                    pendingCode: '',
                    statusMessage: `Instance ${value} not found in database.`
                }));
                toast.error(`Instance ${value} not found in database.`);
                return;
            }

            // Instance found - proceed with validation
            const alreadyInShipment = items.some(item => normalizeCode(item.sampleCode || item.id || '') === value);
            if (alreadyInShipment) {
                toast.error(`Sample ${value} is already part of this shipment.`);
                setScanModalState(prev => ({ ...prev, pendingCode: '', statusMessage: '' }));
                return;
            }

            setScanModalState(prev => {
                // Check if instance is already queued (by code)
                if (prev.scannedCodes.includes(value)) {
                    return {
                        ...prev,
                        pendingCode: '',
                        statusMessage: `Instance ${value} is already queued.`
                    };
                }

                // Store both the code (for display) and the full instance object
                return {
                    ...prev,
                    scannedCodes: [...prev.scannedCodes, value],
                    scannedInstances: [...prev.scannedInstances, foundInstance],
                    pendingCode: '',
                    statusMessage: `Instance ${value} found and queued.`,
                    missingCodes: prev.missingCodes.filter(code => code !== value)
                };
            });
        } catch (error) {
            console.error('Error searching for instance:', error);
            setScanModalState(prev => ({
                ...prev,
                pendingCode: '',
                statusMessage: `Error searching for instance: ${error.message}`
            }));
            toast.error(`Failed to search for instance ${value}.`);
        }
    };

    const handleScanKeyDown = (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            queueScannedCode(event.target.value);
        }
    };

    const removeQueuedCode = (codeToRemove) => {
        setScanModalState(prev => {
            const codeIndex = prev.scannedCodes.indexOf(codeToRemove);
            const newCodes = prev.scannedCodes.filter(code => code !== codeToRemove);
            const newInstances = prev.scannedInstances.filter((_, index) => index !== codeIndex);
            
            return {
                ...prev,
                scannedCodes: newCodes,
                scannedInstances: newInstances
            };
        });
    };

    const clearQueuedCodes = () => {
        setScanModalState(prev => ({
            ...prev,
            scannedCodes: [],
            scannedInstances: []
        }));
    };

    const handleApplyScannedCodes = async () => {
        console.log('scannedInstances', scanModalState.scannedInstances);
        
        const foundInstances = scanModalState.scannedInstances || [];
        
        if (foundInstances.length === 0) {
            setScanModalState(prev => ({
                ...prev,
                statusMessage: 'Scan at least one barcode before continuing.'
            }));
            return;
        }
    
        setScanModalState(prev => ({
            ...prev,
            isSubmitting: true,
            statusMessage: 'Processing scanned instances...',
            missingCodes: []
        }));
    
        try {
            // Validate instances - check for instanceCode and sampleCode
            const validInstances = foundInstances.filter(instance => 
                instance && instance.instanceCode && instance.sampleCode
            );
    
            console.log('Valid instances after filtering:', validInstances);
    
            if (validInstances.length === 0) {
                setScanModalState(prev => ({
                    ...prev,
                    isSubmitting: false,
                    statusMessage: 'No valid instances found in the queue.'
                }));
                toast.error('No valid instances found in the queue.');
                return;
            }
    
            // Fetch all samples to build a map by sampleCode
            const samplesRes = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/samples`);
            if (!samplesRes.ok) throw new Error('Failed to load sample catalog.');
            
            const allSamples = await samplesRes.json();
            console.log('Fetched samples:', allSamples?.length);
            
            // Create two maps: one by normalized sampleCode, one by _id (for fallback)
            const sampleMapByCode = new Map(
                (allSamples || [])
                    .filter(sample => sample?.sampleCode)
                    .map(sample => [normalizeCode(sample.sampleCode), sample])
            );
            console.log('sampleMapByCode', sampleMapByCode);
            const sampleMapById = new Map(
                (allSamples || [])
                    .filter(sample => sample?._id)
                    .map(sample => [sample._id.toString(), sample])
            );
            console.log('Sample Map by Code created with', sampleMapByCode.size, 'samples');
            console.log('Sample Map by ID created with', sampleMapById.size, 'samples');
    
            const processedInstances = [];
            const errors = [];
    
            for (const instance of validInstances) {
                try {
                    console.log('Processing instance:', instance.instanceCode, 'with sampleCode:', instance.sampleCode, 'idSample:', instance.idSample);
                    
                    let sample = null;
                    
                    // Try to find sample by sampleCode first
                    if (instance.sampleCode) {
                        const normalizedSampleCode = normalizeCode(instance.sampleCode);
                        sample = sampleMapByCode.get(normalizedSampleCode);
                        console.log('Sample lookup by code:', normalizedSampleCode, 'found:', !!sample);
                    }
                    
                    // Fallback: try to find sample by idSample if sampleCode lookup failed
                    if (!sample && instance.idSample) {
                        sample = sampleMapById.get(instance.idSample.toString());
                        console.log('Sample lookup by ID:', instance.idSample, 'found:', !!sample);
                    }
                    
                    if (!sample) {
                        const errorMsg = `Sample not found for instance ${instance.instanceCode}. ` +
                            `Tried sampleCode: ${instance.sampleCode || 'N/A'}, idSample: ${instance.idSample || 'N/A'}`;
                        errors.push(errorMsg);
                        console.error(errorMsg);
                        continue;
                    }
    
                    // Assign variables after validation
                    const sampleId = sample._id;
                    const sampleCode = sample.sampleCode || instanceSampleCode;
                    const description = sample.description || sample.sampleDescription || sample.projectName || sampleCode;
                    const lot = instance.lotNo || '';
    
                    console.log(`Found sample: ID=${sampleId}, Code=${sampleCode}, Description=${description}`);
    
                    // Check if shipping line already exists for this sample
                    const existingShippingLine = items.find(item => 
                        (item.id === sampleId || item.sampleId === sampleId) ||
                        normalizeCode(item.sampleCode || '') === normalizeCode(sampleCode)
                    );
                    
                    let shippingLineId;
                    let shippingLine;
    
                    if (existingShippingLine) {
                        // Use existing shipping line
                        shippingLineId = existingShippingLine._id || existingShippingLine.id;
                        shippingLine = existingShippingLine;
                        console.log(`Found existing shipping line ${shippingLineId} for sample ${sampleCode}`);
                    } else {
                        // Create new shipping line for this sample
                        console.log(`Creating new shipping line for sample ${sampleCode}`);
                        const createLineRes = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/shipping/${id}/lines`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                sampleId: sampleId,
                                shippingId: id,
                                company_id:user.company_id,
                                sampleCode: sampleCode,
                                description: description,
                                lot: lot,
                                quantity: 0
                            })
                        });
    
                        if (!createLineRes.ok) {
                            const errorText = await createLineRes.text();
                            throw new Error(`Failed to create shipping line for sample ${sampleCode}: ${errorText}`);
                        }
    
                        const newLine = await createLineRes.json();
                        shippingLineId = newLine._id;
                        shippingLine = {
                            _id: newLine._id,
                            id: newLine.sampleId,
                            sampleCode: newLine.sampleCode || sampleCode,
                            description: newLine.description || description,
                            lot: newLine.lot || lot,
                            quantity: (newLine.instances && Array.isArray(newLine.instances)) ? newLine.instances.length : (newLine.quantity ?? 0),
                            instances: newLine.instances || []
                        };
    
                        // Add to local state
                        setItems(prev => [...prev, shippingLine]);
                        console.log(`Created new shipping line ${shippingLineId}`);
                    }
    
                    // Prepare instance data for shipping line according to schema
                    const instanceData = {
                        instanceId: instance._id,
                        instanceCode: instance.instanceCode,
                        sampleCode: instance.sampleCode,
                        lotNo: instance.lotNo || '',
                        status: instance.status || 'Pending'
                    };
    
                    console.log('Attempting to add instance:', instanceData);
    
                    // Add instance to shipping line's instances array
                    try {
                        // Fetch current shipping line to get existing instances
                        const getLineRes = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/shipping/lines/${shippingLineId}`);
                        if (!getLineRes.ok) {
                            throw new Error(`Failed to fetch current shipping line data: ${getLineRes.status} ${getLineRes.statusText}`);
                        }
                        
                        const currentLine = await getLineRes.json();
                        const currentInstances = currentLine.instances || [];
                        
                        // Check if instance already exists
                        const instanceExists = currentInstances.some(i => 
                            (i.instanceId && i.instanceId.toString() === instance._id.toString()) ||
                            (i.instanceCode && normalizeCode(i.instanceCode) === normalizeCode(instance.instanceCode))
                        );
    
                        if (!instanceExists) {
                                // Add new instance to array
                                const updatedInstances = [...currentInstances, instanceData];
                                const newQuantity = updatedInstances.length;
                                
                                const updateLineRes = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/shipping/lines/${shippingLineId}`, {
                                    method: 'PUT',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                        instances: updatedInstances,
                                        quantity: newQuantity
                                    })
                                });
    
                                if (!updateLineRes.ok) {
                                    const errorText = await updateLineRes.text();
                                    throw new Error(`Failed to update shipping line: ${updateLineRes.status} ${updateLineRes.statusText} - ${errorText}`);
                                }
                                
                                console.log(`Successfully added instance ${instance.instanceCode} to shipping line ${shippingLineId}. Quantity updated to ${newQuantity}`);
                                
                                // Create movement record for shipping
                                try {
                                    const movementData = {
                                        instanceId: instance._id,
                                        movementType: 'Shipped',
                                        movementDate: new Date(),
                                        shippingId: id,
                                        shippingCode: log.shippingCode || null,
                                        warehouseId: instance.warehouseID || null,
                                        location: null,
                                        notes: `Instance shipped via shipping log ${log.shippingCode || id}`
                                    };
                                    
                                    const movementRes = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/instance-movements`, {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify(movementData)
                                    });
                                    
                                    if (!movementRes.ok) {
                                        console.warn(`Failed to create movement record for instance ${instance.instanceCode}`);
                                    } else {
                                        console.log(`Created shipping movement for instance ${instance.instanceCode}`);
                                    }
                                } catch (movementError) {
                                    console.error(`Error creating movement for instance ${instance.instanceCode}:`, movementError);
                                    // Don't fail the whole operation if movement creation fails
                                }
                            } else {
                                console.log(`Instance ${instance.instanceCode} already exists in shipping line, skipping`);
                            }
                    } catch (instanceError) {
                        console.error(`Error adding instance ${instance.instanceCode} to shipping line:`, instanceError);
                        errors.push(`Failed to add instance ${instance.instanceCode}: ${instanceError.message}`);
                        continue;
                    }
    
                    processedInstances.push({
                        instanceCode: instance.instanceCode,
                        sampleCode: sampleCode,
                        shippingLineId: shippingLineId
                    });
    
                } catch (instanceError) {
                    console.error(`Error processing instance:`, instanceError);
                    const errorMsg = `Failed to process instance ${instance.instanceCode}: ${instanceError.message}`;
                    errors.push(errorMsg);
                }
            }
    
            // Refresh shipping lines to get updated data with new instances
            try {
                const linesRes = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/shipping/${id}/lines`);
                if (linesRes.ok) {
                    const lines = await linesRes.json();
                    console.log('Refreshed shipping lines:', lines);
                    setItems(lines.map(l => {
                        // Handle instances - could be array of objects or array of IDs
                        const instances = l.instances || [];
                        const instanceCount = Array.isArray(instances) ? instances.length : 0;
                        console.log(`Line ${l._id}: instances =`, instances, 'count =', instanceCount, 'quantity field =', l.quantity);
                        return {
                            _id: l._id,
                            id: l.sampleId,
                            sampleCode: l.sampleCode,
                            description: l.description,
                            lot: l.lot || '',
                            quantity: instanceCount > 0 ? instanceCount : (l.quantity || 0),
                            instances: instances
                        };
                    }));
                    console.log('Refreshed shipping lines with updated quantities');
                }
            } catch (refreshError) {
                console.warn('Could not refresh shipping lines:', refreshError);
            }
    
            console.log('Processing complete. Processed:', processedInstances.length, 'Errors:', errors.length);
    
            // Show results to user
            if (errors.length > 0) {
                console.error('Errors encountered:', errors);
                toast.error(`Some instances failed: ${errors.slice(0, 2).join('; ')}${errors.length > 2 ? `... and ${errors.length - 2} more` : ''}`);
            }
    
            if (processedInstances.length > 0) {
                toast.success(`Successfully added ${processedInstances.length} instance${processedInstances.length > 1 ? 's' : ''} to shipment.`);
            }
    
            // Close modal if all processed successfully
            if (processedInstances.length === validInstances.length && errors.length === 0) {
                closeScanModal();
            } else {
                setScanModalState(prev => ({
                    ...prev,
                    isSubmitting: false,
                    statusMessage: errors.length > 0
                        ? `Processed ${processedInstances.length} of ${validInstances.length} instances. ${errors.length} failed.`
                        : 'Processing complete.'
                }));
            }
    
        } catch (error) {
            console.error('Error in handleApplyScannedCodes:', error);
            toast.error(error.message || 'Failed to process scanned instances.');
            setScanModalState(prev => ({
                ...prev,
                isSubmitting: false,
                statusMessage: error.message || 'Failed to process scanned instances.'
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
            const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/shipping/lines/${lineId}`, {
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
            const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/shipping/lines/${lineId}`, {
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
            console.log(payload);
            let res;
            if (id && id !== 'add') {
                // Update existing
                res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/shipping/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
            } else {
                // Create new
                res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/shipping`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
            }

            if (!res.ok) throw new Error('Failed to save');
            const savedData = await res.json();
            
            toast.success("Details Saved!");

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
            const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/shipping/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed to delete');
            
            toast.warning('Log deleted successfully!');
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
                const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/shipping/${id}`, {
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
                const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/shipping/${id}`, {
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
                                <select name='projectCode' value={log.projectCode || ''} onChange={onProjectChange}>
                                    <option value=''>Select project...</option>
                                    {projectsLoading ? (
                                        <option value='' disabled>Loading...</option>
                                    ) : (
                                        projects.map(p => (
                                            <option key={p._id || p.projectID} value={p.projectCode || p.projectID}>
                                                {p.projectCode || p.projectID || p.name}
                                            </option>
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
                    <div className={styles.multiTable}>
                        <div className={`${styles.tableContainer}  ${selectedRowId ? styles.leftTable : styles.fullTable}`}>
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
                                                {(() => {
                                                    const instances = item.instances || [];
                                                    const instanceCount = Array.isArray(instances) ? instances.length : 0;
                                                    const displayQuantity = instanceCount > 0 ? instanceCount : (item.quantity || 0);
                                                    return (
                                                        <input 
                                                            type="number" 
                                                            value={displayQuantity} 
                                                            readOnly
                                                            className={styles.tableInput}
                                                            style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}
                                                            title="Quantity is automatically calculated from the number of instances"
                                                        />
                                                    );
                                                })()}
                                            </td>
                                            <td>
                                                <div style={{display: 'flex', gap: '8px', alignItems: 'center'}}>
                                                    <button
                                                        className={`${styles.addButton} ${selectedRowId === (item._id || item.id) ? styles.activeButton : ''}`}
                                                        onClick={() => handleInstanceToggle(item._id || item.id)}
                                                    >
                                                        <TfiAlignJustify />
                                                    </button>
                                                    {/* <button
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
                                                    </button> */}
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

                                    {/* instance talbe for selected row */}
                        {selectedRowId && (
                                <div className={styles.rightTable}>
                                    <table className={styles.itemsTable}>
                                        <thead>
                                            <tr>
                                                <th>Instance ID</th>
                                                <th>Sample ID</th>
                                                <th>Lot</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {instanceData.length === 0 ? (
                                                <tr>
                                                    <td colSpan="3" style={{textAlign:'center',padding:'10px'}}>
                                                        No instances found for this shipping line
                                                    </td>
                                                </tr>
                                            ) : (
                                                instanceData.map((instanceItem, index) => (
                                                    <tr key={instanceItem.instanceID || index}>
                                                        <td>{instanceItem.instanceID || '-'}</td>
                                                        <td>{instanceItem.sampleID || '-'}</td>
                                                        <td>{instanceItem.lot || '-'}</td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            )}
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
                                const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/shipping/${id}/lines`, {
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
                        projectId={log.projectID}
                        project={projects.find(p => (p._id === log.projectID) || (p.projectID === log.projectID))}
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
