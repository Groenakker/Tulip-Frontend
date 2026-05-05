import WhiteIsland from '../../../components/Whiteisland';
import styles from './ShippingDetails.module.css';
import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { FaSave, FaTrash, FaBarcode, FaTruck, FaPrint, FaSyncAlt, FaMapMarkerAlt, FaBoxOpen, FaUndo, FaLocationArrow } from 'react-icons/fa';
import TrackingView from './TrackingView';
import { TfiAlignJustify } from "react-icons/tfi";
import Modal from '../../../components/Modal';
import SampleForm from '../../../components/modals/SampleModal';
import SampleSelect from '../../../components/modals/SampleSelect'
import InstanceList from '../../../components/modals/InstanceListModal';
import toast from '../../../components/Toaster/toast';
import SignatureCanvas from 'react-signature-canvas';
import { useAuth } from '../../../context/AuthContext';  
import Header from '../../../components/Header';
import { FaPlus, FaGlobe } from 'react-icons/fa';
export default function ShipmentDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
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
        image: '',
        bPartnerID: '',
        bPartnerCode: '',
    });

    //Sample items state
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [projects, setProjects] = useState([]);
    const [projectsLoading, setProjectsLoading] = useState(true);

    // ----------------------------------------------------------------
    // Shippo-related state
    // ----------------------------------------------------------------
    // List of customers (bPartners) for the customer-first selection flow.
    const [customers, setCustomers] = useState([]);
    const [customersLoading, setCustomersLoading] = useState(true);
    // The selected bPartner id (drives project filtering + destination auto-fill).
    const [selectedCustomerId, setSelectedCustomerId] = useState('');

    // Ship-from and ship-to snapshots kept on the record.
    const [shipFrom, setShipFrom] = useState({
        addressId: '', label: '',
        name: '', company: '', street1: '', street2: '', city: '',
        state: '', zip: '', country: 'US', phone: '', email: '',
    });
    const [shipTo, setShipTo] = useState({
        name: '', company: '', street1: '', street2: '', city: '',
        state: '', zip: '', country: 'US', phone: '', email: '',
    });

    // Saved company shipping addresses (populated from Settings > Company).
    // Drives the "Select saved address" dropdown so users don't retype.
    const [companyShippingAddresses, setCompanyShippingAddresses] = useState([]);
    const [selectedCompanyAddressId, setSelectedCompanyAddressId] = useState('');

    // Parcel dimensions used to request rates.
    const [parcel, setParcel] = useState({
        length: '', width: '', height: '', distance_unit: 'in',
        weight: '', mass_unit: 'lb',
    });

    // Customs declaration (required for international shipments).
    const emptyCustomsItem = {
        description: '',
        quantity: 1,
        netWeight: '',
        massUnit: 'lb',
        valueAmount: '',
        valueCurrency: 'USD',
        originCountry: 'US',
        tariffNumber: '',
        skuCode: '',
    };
    const [customs, setCustoms] = useState({
        enabled: false,
        contentsType: 'MERCHANDISE',
        contentsExplanation: '',
        nonDeliveryOption: 'RETURN',
        incoterm: '',
        certify: true,
        certifySigner: '',
        eelPfc: '',
        items: [],
    });

    // Remote Shippo state
    const [shippoConfigured, setShippoConfigured] = useState(false);
    const [rates, setRates] = useState([]);
    const [selectedRateId, setSelectedRateId] = useState('');
    const [ratesLoading, setRatesLoading] = useState(false);
    const [labelLoading, setLabelLoading] = useState(false);
    const [refundLoading, setRefundLoading] = useState(false);

    // Label + tracking info derived from the persisted shipping document.
    // The full live tracking (events, ETA, timeline) is owned by the
    // embedded <TrackingView/> below — this state only drives the compact
    // "Shipment Purchased" summary card.
    const [labelInfo, setLabelInfo] = useState({
        labelUrl: '', labelFileType: '', commercialInvoiceUrl: '',
        trackingNumber: '', trackingUrlProvider: '', carrier: '',
        serviceLevel: '', serviceLevelName: '', shippingCost: '', shippingCurrency: '',
        shippoShipmentId: '', shippoTransactionId: '', trackingStatus: '',
    });

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
                // Kick off these fetches in parallel — they're independent.
                const [projRes, bpRes, shippoCfgRes, shippingAddrRes] = await Promise.all([
                    fetch(`${import.meta.env.VITE_BACKEND_URL}/api/projects`).catch(() => null),
                    fetch(`${import.meta.env.VITE_BACKEND_URL}/api/bpartners`).catch(() => null),
                    fetch(`${import.meta.env.VITE_BACKEND_URL}/api/shippo/config`).catch(() => null),
                    user?.companyId
                        ? fetch(`${import.meta.env.VITE_BACKEND_URL}/api/companies/${user.companyId}/shipping-addresses`).catch(() => null)
                        : Promise.resolve(null),
                ]);

                // Company-configured shipping addresses (Settings > Company).
                // Auto-select the default one so shipFrom is pre-populated.
                let defaultCompanyAddress = null;
                try {
                    if (shippingAddrRes && shippingAddrRes.ok) {
                        const addrs = await shippingAddrRes.json() || [];
                        setCompanyShippingAddresses(Array.isArray(addrs) ? addrs : []);
                        if (Array.isArray(addrs) && addrs.length > 0) {
                            defaultCompanyAddress = addrs.find(a => a.isDefault) || addrs[0];
                        }
                    }
                } catch (e) { console.error('Error loading company shipping addresses:', e); }

                // Projects
                try {
                    if (projRes && projRes.ok) {
                        setProjects(await projRes.json() || []);
                    }
                } catch (e) { console.error('Error loading projects:', e); }
                finally { setProjectsLoading(false); }

                // Customers (bPartners) — only those that can be shipped to.
                try {
                    if (bpRes && bpRes.ok) {
                        const bpData = await bpRes.json() || [];
                        const clients = bpData.filter(
                            b => !b.category || b.category === 'Client' || b.category === 'Client & Vendor'
                        );
                        setCustomers(clients);
                    }
                } catch (e) { console.error('Error loading customers:', e); }
                finally { setCustomersLoading(false); }

                // Shippo config (ship-from defaults + parcel defaults)
                let defaultFrom = null;
                try {
                    if (shippoCfgRes && shippoCfgRes.ok) {
                        const cfg = await shippoCfgRes.json();
                        setShippoConfigured(Boolean(cfg?.configured));
                        if (cfg?.defaultFromAddress) {
                            defaultFrom = cfg.defaultFromAddress;
                            // Only fall back to env-based defaults if the company
                            // doesn't have any saved shipping addresses.
                            if (!defaultCompanyAddress) {
                                setShipFrom(prev => ({ ...prev, ...cfg.defaultFromAddress }));
                            }
                        }
                        if (cfg?.defaultParcel) {
                            setParcel(prev => ({ ...prev, ...cfg.defaultParcel }));
                        }
                    }
                } catch (e) { console.error('Error loading shippo config:', e); }

                // If the company has a default saved address, prefer that
                // over env defaults. Makes the "Ship From" card useful out
                // of the box for multi-location companies.
                if (defaultCompanyAddress) {
                    setSelectedCompanyAddressId(String(defaultCompanyAddress._id));
                    setShipFrom(prev => ({
                        ...prev,
                        addressId: defaultCompanyAddress._id,
                        label: defaultCompanyAddress.label || '',
                        name: defaultCompanyAddress.name || '',
                        company: defaultCompanyAddress.company || '',
                        street1: defaultCompanyAddress.street1 || '',
                        street2: defaultCompanyAddress.street2 || '',
                        city: defaultCompanyAddress.city || '',
                        state: defaultCompanyAddress.state || '',
                        zip: defaultCompanyAddress.zip || '',
                        country: defaultCompanyAddress.country || 'US',
                        phone: defaultCompanyAddress.phone || '',
                        email: defaultCompanyAddress.email || '',
                    }));
                    defaultFrom = defaultFrom || {
                        company: defaultCompanyAddress.company || defaultCompanyAddress.name,
                        name: defaultCompanyAddress.name,
                        city: defaultCompanyAddress.city,
                        state: defaultCompanyAddress.state,
                    };
                }

                // When creating a new shipping, seed the free-form origin with
                // the configured company address so the user doesn't type it.
                if ((!id || id === 'add') && defaultFrom && (defaultFrom.city || defaultFrom.name)) {
                    setLog(prev => ({
                        ...prev,
                        shipmentOrigin: prev.shipmentOrigin
                            || [defaultFrom.company || defaultFrom.name, defaultFrom.city, defaultFrom.state]
                                .filter(Boolean).join(', '),
                    }));
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
                            image: data.image || '',
                            bPartnerID: data.bPartnerID || '',
                            bPartnerCode: data.bPartnerCode || '',
                        });

                        // Customer id is either stored directly on the shipping
                        // doc or can be inferred from the related project.
                        setSelectedCustomerId(data.bPartnerID || '');

                        if (data.customerSnapshot) {
                            setShipTo(prev => ({ ...prev, ...data.customerSnapshot }));
                        }
                        if (data.shipFrom) {
                            setShipFrom(prev => ({ ...prev, ...data.shipFrom }));
                            if (data.shipFrom.addressId) {
                                setSelectedCompanyAddressId(String(data.shipFrom.addressId));
                            }
                        }
                        if (data.parcel) {
                            setParcel(prev => ({ ...prev, ...data.parcel }));
                        }
                        if (data.customs) {
                            setCustoms(prev => ({
                                ...prev,
                                ...data.customs,
                                items: Array.isArray(data.customs.items) ? data.customs.items : [],
                            }));
                        }
                        setLabelInfo({
                            labelUrl: data.labelUrl || '',
                            labelFileType: data.labelFileType || '',
                            commercialInvoiceUrl: data.commercialInvoiceUrl || '',
                            trackingNumber: data.trackingNumber || '',
                            trackingUrlProvider: data.trackingUrlProvider || '',
                            carrier: data.carrier || '',
                            serviceLevel: data.serviceLevel || '',
                            serviceLevelName: data.serviceLevelName || '',
                            shippingCost: data.shippingCost || '',
                            shippingCurrency: data.shippingCurrency || '',
                            shippoShipmentId: data.shippoShipmentId || '',
                            shippoTransactionId: data.shippoTransactionId || '',
                            trackingStatus: data.trackingStatus || '',
                        });

                        const linesRes = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/shipping/${id}/lines`);
                        if (linesRes.ok) {
                            const lines = await linesRes.json();
                            setItems(lines.map(l => {
                                const instances = l.instances || [];
                                const instanceCount = Array.isArray(instances) ? instances.length : 0;
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

    // Deep-link support: when navigating here with a hash (e.g. from the
    // Shipping Log list's Track button → /ShippingLog/:id#tracking-section),
    // scroll the matching element into view once the content has rendered.
    // We poll briefly because the tracking card only appears after the
    // shipping record finishes loading and a label has been purchased.
    useEffect(() => {
        if (!location.hash) return;
        const targetId = location.hash.replace('#', '');
        if (!targetId) return;
        let attempts = 0;
        const interval = setInterval(() => {
            const el = document.getElementById(targetId);
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                clearInterval(interval);
            } else if (++attempts > 20) {
                clearInterval(interval);
            }
        }, 150);
        return () => clearInterval(interval);
    }, [location.hash, labelInfo.trackingNumber]);

    // If the persisted record had no bPartnerID but did have a projectID, derive
    // the customer once projects finish loading. This keeps legacy records working.
    useEffect(() => {
        if (!selectedCustomerId && log.projectID && projects.length > 0) {
            const proj = projects.find(p => p._id === log.projectID || p.projectID === log.projectID);
            if (proj && proj.bPartnerID) {
                setSelectedCustomerId(proj.bPartnerID);
            }
        }
    }, [projects, log.projectID, selectedCustomerId]);

    // Whenever the selected customer changes, auto-populate the destination /
    // ship-to fields from the bPartner record.
    useEffect(() => {
        if (!selectedCustomerId) return;
        const cust = customers.find(c => c._id === selectedCustomerId);
        if (!cust) return;
        const primaryContact = Array.isArray(cust.contacts) && cust.contacts.length > 0 ? cust.contacts[0] : null;
        const addr = {
            name: cust.name || primaryContact?.name || '',
            company: cust.name || '',
            street1: cust.address1 || '',
            street2: cust.address2 || '',
            city: cust.city || '',
            state: cust.state || '',
            zip: cust.zip || '',
            country: cust.country || 'US',
            phone: cust.phone || primaryContact?.phone || '',
            email: cust.email || primaryContact?.email || '',
        };
        setShipTo(addr);
        setLog(prev => ({
            ...prev,
            bPartnerID: cust._id,
            bPartnerCode: cust.partnerNumber || prev.bPartnerCode,
            shipmentDestination: prev.shipmentDestination || [cust.name, cust.city, cust.state].filter(Boolean).join(', '),
        }));
    }, [selectedCustomerId, customers]);

    // Projects filtered by the selected customer (if any).
    const filteredProjects = useMemo(() => {
        if (!selectedCustomerId) return projects;
        return projects.filter(p => p.bPartnerID === selectedCustomerId);
    }, [projects, selectedCustomerId]);

    const onCustomerChange = (e) => {
        const newId = e.target.value;
        setSelectedCustomerId(newId);
        // Clear the selected project when switching customers so the user
        // has to pick a project belonging to the new customer.
        setLog(prev => ({
            ...prev,
            projectID: '',
            projectCode: '',
            projectDesc: '',
        }));
    };

    const onProjectChange = (e) => {
        const selectedValue = e.target.value;
        const selected = filteredProjects.find(p =>
            p.projectCode === selectedValue ||
            p.projectID === selectedValue ||
            p._id === selectedValue
        );

        if (selected) {
            setLog(prev => ({
                ...prev,
                projectCode: selected.projectCode || selected.projectID || selectedValue || '',
                projectID: selected._id || selected.projectID || '',
                projectDesc: selected.description || selected.projectDesc || selected.name || '',
            }));
        } else {
            setLog(prev => ({
                ...prev,
                projectCode: '',
                projectID: '',
                projectDesc: '',
            }));
        }
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
                                        sampleId: instance.idSample || null,
                                        movementType: 'Shipped',
                                        movementDate: new Date(),
                                        shippingId: id,
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
                                    // Clear warehouseID from instance since it's been shipped
                                    if (instance.warehouseID) {
                                        try {
                                            await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/instances/${instance._id}`, {
                                                method: 'PUT',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({ warehouseID: null })
                                            });
                                        } catch (clearErr) {
                                            console.warn(`Failed to clear warehouse from instance ${instance.instanceCode}:`, clearErr);
                                        }
                                    }
                                } catch (movementError) {
                                    console.error(`Error creating movement for instance ${instance.instanceCode}:`, movementError);
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
                // Persist customer + Shippo-related snapshots so rates can be
                // regenerated later without re-entering everything.
                customerSnapshot: shipTo,
                shipFrom,
                parcel,
                customs,
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

    // ============================================================
    // Shippo handlers
    // ------------------------------------------------------------
    // All of these hit our own backend — the Shippo API token stays
    // server-side (per security rules). Each call uses the current
    // shipping record id (must be saved first).
    // ============================================================

    const ensureSavedShipping = () => {
        if (!id || id === 'add') {
            toast.error('Save the shipping record before using Shippo features.');
            return false;
        }
        if (!shippoConfigured) {
            toast.error('Shippo is not configured. Set SHIPPO_API_TOKEN in the backend .env.');
            return false;
        }
        return true;
    };

    const handleGetRates = async () => {
        if (!ensureSavedShipping()) return;
        // Basic validation
        if (!shipTo.street1 || !shipTo.city || !shipTo.zip) {
            toast.error('Please select a customer with a complete shipping address.');
            return;
        }
        if (!parcel.length || !parcel.width || !parcel.height || !parcel.weight) {
            toast.error('Please fill in all parcel dimensions (length, width, height, weight).');
            return;
        }

        // If the shipment crosses borders and customs is enabled, require
        // at least one customs item so Shippo can build a declaration.
        const isInternational =
            (shipFrom.country || '').toUpperCase() !==
            (shipTo.country || '').toUpperCase();
        if (isInternational && customs.enabled) {
            if (!customs.items || customs.items.length === 0) {
                toast.error('International shipment: add at least one customs item.');
                return;
            }
            const missing = customs.items.find(
                it => !it.description || !it.valueAmount || !it.netWeight
            );
            if (missing) {
                toast.error('Each customs item needs description, value, and net weight.');
                return;
            }
            if (!customs.certifySigner) {
                toast.error('Please enter the customs "Certify Signer" name.');
                return;
            }
        }

        setRatesLoading(true);
        setSelectedRateId('');
        try {
            const res = await fetch(
                `${import.meta.env.VITE_BACKEND_URL}/api/shippo/shipping/${id}/shipment`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        addressFrom: shipFrom,
                        addressTo: shipTo,
                        parcel,
                        customs: isInternational ? customs : undefined,
                    }),
                }
            );
            const data = await res.json();
            if (!res.ok) throw new Error(data?.message || 'Failed to get rates');
            setRates(data.rates || []);
            if (data.rates && data.rates.length > 0) {
                // Default to the cheapest rate to speed up one-click buying.
                const cheapest = [...data.rates].sort(
                    (a, b) => parseFloat(a.amount) - parseFloat(b.amount)
                )[0];
                setSelectedRateId(cheapest.object_id);
                toast.success(`Found ${data.rates.length} rates.`);
            } else {
                toast.warning?.('No rates returned. Check address/parcel details or carrier account setup.');
            }
            setLabelInfo(prev => ({ ...prev, shippoShipmentId: data.shippoShipmentId || prev.shippoShipmentId }));
        } catch (err) {
            console.error(err);
            toast.error(err.message || 'Failed to get rates');
        } finally {
            setRatesLoading(false);
        }
    };

    const handleBuyLabel = async () => {
        if (!ensureSavedShipping()) return;
        if (!selectedRateId) {
            toast.error('Select a shipping rate first.');
            return;
        }
        if (!window.confirm('Purchase this shipping label? This will charge your Shippo account.')) return;

        setLabelLoading(true);
        try {
            const res = await fetch(
                `${import.meta.env.VITE_BACKEND_URL}/api/shippo/shipping/${id}/label`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ rateId: selectedRateId }),
                }
            );
            const data = await res.json();

            if (!res.ok) {
                // Shippo carrier errors arrive as `shippoMessages`. Surface them
                // so the user actually knows what to fix (e.g. missing phone,
                // invalid address, service not available, etc.).
                console.error('Buy Label failed:', data);
                const carrierMessages = Array.isArray(data?.shippoMessages)
                    ? data.shippoMessages
                        .map(m => (typeof m === 'string' ? m : [m?.source, m?.code, m?.text].filter(Boolean).join(' — ')))
                        .filter(Boolean)
                    : [];
                const composed = carrierMessages.length > 0
                    ? `${data.message || 'Label purchase failed'}\n\n${carrierMessages.join('\n')}`
                    : (data?.message || 'Failed to purchase label');
                toast.error(composed);
                return;
            }

            const s = data.shipping || {};
            setLabelInfo({
                labelUrl: s.labelUrl || data.transaction?.label_url || '',
                labelFileType: s.labelFileType || '',
                commercialInvoiceUrl: s.commercialInvoiceUrl || data.transaction?.commercial_invoice_url || '',
                trackingNumber: s.trackingNumber || data.transaction?.tracking_number || '',
                trackingUrlProvider: s.trackingUrlProvider || data.transaction?.tracking_url_provider || '',
                carrier: s.carrier || '',
                serviceLevel: s.serviceLevel || '',
                serviceLevelName: s.serviceLevelName || '',
                shippingCost: s.shippingCost || '',
                shippingCurrency: s.shippingCurrency || '',
                shippoShipmentId: s.shippoShipmentId || '',
                shippoTransactionId: s.shippoTransactionId || data.transaction?.object_id || '',
                trackingStatus: s.trackingStatus || 'UNKNOWN',
            });
            setLog(prev => ({
                ...prev,
                status: s.status || 'Shipped',
                shipmentDate: s.shipmentDate ? new Date(s.shipmentDate).toISOString().slice(0, 10) : prev.shipmentDate,
            }));
            toast.success('Label purchased successfully!');
        } catch (err) {
            console.error(err);
            toast.error(err.message || 'Failed to purchase label');
        } finally {
            setLabelLoading(false);
        }
    };

    const handlePrintLabel = () => {
        if (!labelInfo.labelUrl) {
            toast.error('No label available to print.');
            return;
        }
        // Open in a new tab — the browser's built-in PDF viewer has Print.
        const w = window.open(labelInfo.labelUrl, '_blank', 'noopener');
        if (!w) toast.error('Pop-up blocked — allow pop-ups and try again.');
    };

    const handleRefundLabel = async () => {
        if (!ensureSavedShipping()) return;
        if (!labelInfo.shippoTransactionId) {
            toast.error('No label to refund.');
            return;
        }
        if (!window.confirm('Refund / void this shipping label? This cannot be undone.')) return;

        setRefundLoading(true);
        try {
            const res = await fetch(
                `${import.meta.env.VITE_BACKEND_URL}/api/shippo/shipping/${id}/refund`,
                { method: 'POST' }
            );
            const data = await res.json();
            if (!res.ok) throw new Error(data?.message || 'Failed to refund label');
            toast.success(`Refund status: ${data.refund?.status || 'requested'}`);
            if (data.shipping) {
                setLog(prev => ({ ...prev, status: data.shipping.status || prev.status }));
            }
        } catch (err) {
            console.error(err);
            toast.error(err.message || 'Failed to refund label');
        } finally {
            setRefundLoading(false);
        }
    };

    const handleShipFromChange = (field, value) => {
        setShipFrom(prev => ({ ...prev, [field]: value }));
    };

    // Switch the whole Ship From block to a different saved company address.
    const handleSelectCompanyAddress = (addressId) => {
        setSelectedCompanyAddressId(addressId);
        if (!addressId) {
            // "Custom" — keep typed fields but clear the addressId link.
            setShipFrom(prev => ({ ...prev, addressId: '', label: '' }));
            return;
        }
        const found = companyShippingAddresses.find(a => String(a._id) === String(addressId));
        if (!found) return;
        setShipFrom({
            addressId: found._id,
            label: found.label || '',
            name: found.name || '',
            company: found.company || '',
            street1: found.street1 || '',
            street2: found.street2 || '',
            city: found.city || '',
            state: found.state || '',
            zip: found.zip || '',
            country: found.country || 'US',
            phone: found.phone || '',
            email: found.email || '',
        });
    };

    // ---------- Customs helpers ----------
    const handleCustomsChange = (field, value) => {
        setCustoms(prev => ({ ...prev, [field]: value }));
    };
    const handleCustomsItemChange = (index, field, value) => {
        setCustoms(prev => ({
            ...prev,
            items: prev.items.map((it, i) => (i === index ? { ...it, [field]: value } : it)),
        }));
    };
    const addCustomsItem = () => {
        setCustoms(prev => ({
            ...prev,
            enabled: true,
            items: [...prev.items, { ...emptyCustomsItem }],
        }));
    };
    const removeCustomsItem = (index) => {
        setCustoms(prev => ({
            ...prev,
            items: prev.items.filter((_, i) => i !== index),
        }));
    };
    const handleShipToChange = (field, value) => {
        setShipTo(prev => ({ ...prev, [field]: value }));
    };
    const handleParcelChange = (field, value) => {
        setParcel(prev => ({ ...prev, [field]: value }));
    };

    /**
     * Fill every Shippo form field with Shippo-recommended US test data so
     * the user can exercise the full Get Rates → Buy Label → Track flow
     * without fighting real carrier validation (international shipments,
     * unverified addresses, etc.).
     *
     * These are the well-known addresses Shippo uses in their own
     * documentation and test fixtures.
     */
    const loadTestData = () => {
        const testFrom = {
            name: 'Mr. Hippo',
            company: 'Shippo',
            street1: '215 Clayton St.',
            street2: '',
            city: 'San Francisco',
            state: 'CA',
            zip: '94117',
            country: 'US',
            phone: '+1 555 341 9393',
            email: 'mrhippo@goshippo.com',
        };
        const testTo = {
            name: 'Mrs. Hippo',
            company: 'Shippo',
            street1: '965 Mission St #572',
            street2: '',
            city: 'San Francisco',
            state: 'CA',
            zip: '94103',
            country: 'US',
            phone: '+1 555 341 9393',
            email: 'mrshippo@goshippo.com',
        };
        const testParcel = {
            length: '10',
            width: '15',
            height: '10',
            distance_unit: 'in',
            weight: '1',
            mass_unit: 'lb',
        };

        setShipFrom(testFrom);
        setShipTo(testTo);
        setParcel(testParcel);
        setRates([]);
        setSelectedRateId('');
        // Keep the log.shipmentOrigin/destination in sync with the test data
        // so the record reads coherently.
        setLog(prev => ({
            ...prev,
            shipmentOrigin: prev.shipmentOrigin || `${testFrom.company}, ${testFrom.city}, ${testFrom.state}`,
            shipmentDestination: `${testTo.company}, ${testTo.city}, ${testTo.state}`,
        }));
        toast.success('Test data loaded. Click "Get Rates" next.');
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
            {/* <h2 className={styles.bHeading}>Shipping Details</h2> */}
            <Header title="Shipping Details" />
            <WhiteIsland className={styles.bigIsland}>
                <h3>Shipping : {log.shippingCode || (id && id !== 'add' ? id : '(unsaved)')}</h3>
                <div className={styles.main}>
                    <div className={styles.detailContainer}>
                        {/* Customer picker — primary driver of the form. */}
                        <div className={styles.details}>
                            <div className={styles.info} style={{ width: '40%' }}>
                                <div className={styles.infoDetail}>Customer</div>
                                <select value={selectedCustomerId} onChange={onCustomerChange}>
                                    <option value=''>Select customer...</option>
                                    {customersLoading ? (
                                        <option value='' disabled>Loading...</option>
                                    ) : (
                                        customers.map(c => (
                                            <option key={c._id} value={c._id}>
                                                {c.name}{c.partnerNumber ? ` (${c.partnerNumber})` : ''}
                                            </option>
                                        ))
                                    )}
                                </select>
                            </div>
                            <div className={styles.info} style={{ width: '25%' }}>
                                <div className={styles.infoDetail}>Project</div>
                                <select
                                    name='projectCode'
                                    value={log.projectCode || ''}
                                    onChange={onProjectChange}
                                    disabled={!selectedCustomerId && !log.projectCode}
                                >
                                    <option value=''>{selectedCustomerId ? 'Select project...' : 'Select customer first'}</option>
                                    {projectsLoading ? (
                                        <option value='' disabled>Loading...</option>
                                    ) : (
                                        filteredProjects.map(p => (
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

                        {/* Customer details — auto-populated from the selected bPartner. */}
                        {selectedCustomerId && (
                            <div className={styles.customerCard}>
                                <div className={styles.customerCardHeader}>
                                    <FaMapMarkerAlt /> Customer details (auto-filled)
                                </div>
                                <div className={styles.customerCardGrid}>
                                    <div><strong>Name:</strong> {shipTo.name || '—'}</div>
                                    <div><strong>Email:</strong> {shipTo.email || '—'}</div>
                                    <div><strong>Phone:</strong> {shipTo.phone || '—'}</div>
                                    <div><strong>Address:</strong> {[shipTo.street1, shipTo.street2].filter(Boolean).join(', ') || '—'}</div>
                                    <div><strong>City/State:</strong> {[shipTo.city, shipTo.state, shipTo.zip].filter(Boolean).join(', ') || '—'}</div>
                                    <div><strong>Country:</strong> {shipTo.country || '—'}</div>
                                </div>
                            </div>
                        )}

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

            {/* Sample information WhiteIsland (moved above Shippo section) */}
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

            {/* ============================================================
                Shippo Shipping WhiteIsland
                (Rendered below Sample Information so users finalize the
                sample list first, then handle the shipping label / customs.)
                ============================================================ */}
            <WhiteIsland className={styles.bigIsland}>
                <div className={styles.headings}>
                    <h3 style={{ border: 'none' }}><FaTruck style={{ marginRight: 8 }} />Shippo — Labels & Tracking</h3>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                        {!shippoConfigured && (
                            <span className={styles.shippoNotConfigured}>
                                Shippo not configured. Set SHIPPO_API_TOKEN in the backend .env.
                            </span>
                        )}
                        <button
                            type='button'
                            className={styles.shippoSecondaryBtn}
                            onClick={loadTestData}
                            title='Fill every field with Shippo-recommended US test data for end-to-end testing.'
                        >
                            Load Test Data
                        </button>
                    </div>
                </div>

                {/* Country mismatch warning — international shipments require customs info
                    and carrier account activation (DHL, FedEx International, etc). */}
                {shipFrom.country && shipTo.country && shipFrom.country !== shipTo.country && (
                    <div className={styles.shippoWarning}>
                        <strong>International shipment detected</strong> ({shipFrom.country} → {shipTo.country}).
                        USPS/UPS test labels only work for US → US. For full testing, click
                        <button type='button' className={styles.shippoInlineLink} onClick={loadTestData}>
                            Load Test Data
                        </button>
                        to use Shippo's recommended US addresses.
                    </div>
                )}

                <div className={styles.shippoLayout}>
                    {/* Ship From — prefers a saved company address (Settings > Company). */}
                    <div className={styles.shippoBlock}>
                        <h4 className={styles.shippoBlockTitle}><FaLocationArrow /> Ship From</h4>

                        {/* Saved-address picker. Empty option means "custom"
                            and lets the user type/edit fields manually below. */}
                        <label className={styles.shippoSavedAddress}>
                            Saved address
                            <select
                                value={selectedCompanyAddressId}
                                onChange={(e) => handleSelectCompanyAddress(e.target.value)}
                            >
                                <option value=''>
                                    {companyShippingAddresses.length === 0
                                        ? 'No saved addresses — add one in Settings > Company'
                                        : 'Custom (type below)'}
                                </option>
                                {companyShippingAddresses.map(a => (
                                    <option key={a._id} value={a._id}>
                                        {a.label}
                                        {a.isDefault ? ' (default)' : ''}
                                        {a.city ? ` — ${a.city}${a.state ? ', ' + a.state : ''}` : ''}
                                    </option>
                                ))}
                            </select>
                        </label>

                        <div className={styles.shippoGrid}>
                            <label>Name<input value={shipFrom.name} onChange={(e) => handleShipFromChange('name', e.target.value)} /></label>
                            <label>Company<input value={shipFrom.company} onChange={(e) => handleShipFromChange('company', e.target.value)} /></label>
                            <label>Street 1<input value={shipFrom.street1} onChange={(e) => handleShipFromChange('street1', e.target.value)} /></label>
                            <label>Street 2<input value={shipFrom.street2} onChange={(e) => handleShipFromChange('street2', e.target.value)} /></label>
                            <label>City<input value={shipFrom.city} onChange={(e) => handleShipFromChange('city', e.target.value)} /></label>
                            <label>State<input value={shipFrom.state} onChange={(e) => handleShipFromChange('state', e.target.value)} /></label>
                            <label>ZIP<input value={shipFrom.zip} onChange={(e) => handleShipFromChange('zip', e.target.value)} /></label>
                            <label>Country<input value={shipFrom.country} onChange={(e) => handleShipFromChange('country', e.target.value.toUpperCase())} maxLength={2} /></label>
                            <label>Phone<input value={shipFrom.phone} onChange={(e) => handleShipFromChange('phone', e.target.value)} /></label>
                            <label>Email<input value={shipFrom.email} onChange={(e) => handleShipFromChange('email', e.target.value)} /></label>
                        </div>
                    </div>

                    {/* Ship To (read-only summary derived from the customer) */}
                    <div className={styles.shippoBlock}>
                        <h4 className={styles.shippoBlockTitle}><FaMapMarkerAlt /> Ship To</h4>
                        {selectedCustomerId ? (
                            <div className={styles.shippoGrid}>
                                <label>Name<input value={shipTo.name} onChange={(e) => handleShipToChange('name', e.target.value)} /></label>
                                <label>Company<input value={shipTo.company} onChange={(e) => handleShipToChange('company', e.target.value)} /></label>
                                <label>Street 1<input value={shipTo.street1} onChange={(e) => handleShipToChange('street1', e.target.value)} /></label>
                                <label>Street 2<input value={shipTo.street2} onChange={(e) => handleShipToChange('street2', e.target.value)} /></label>
                                <label>City<input value={shipTo.city} onChange={(e) => handleShipToChange('city', e.target.value)} /></label>
                                <label>State<input value={shipTo.state} onChange={(e) => handleShipToChange('state', e.target.value)} /></label>
                                <label>ZIP<input value={shipTo.zip} onChange={(e) => handleShipToChange('zip', e.target.value)} /></label>
                                <label>Country<input value={shipTo.country} onChange={(e) => handleShipToChange('country', e.target.value.toUpperCase())} maxLength={2} /></label>
                                <label>Phone<input value={shipTo.phone} onChange={(e) => handleShipToChange('phone', e.target.value)} /></label>
                                <label>Email<input value={shipTo.email} onChange={(e) => handleShipToChange('email', e.target.value)} /></label>
                            </div>
                        ) : (
                            <div className={styles.shippoEmptyNotice}>Select a customer above to auto-fill the destination.</div>
                        )}
                    </div>

                    {/* Parcel */}
                    <div className={styles.shippoBlock}>
                        <h4 className={styles.shippoBlockTitle}><FaBoxOpen /> Parcel</h4>
                        <div className={styles.parcelGrid}>
                            <label>Length<input type='number' min='0' step='0.01' value={parcel.length} onChange={(e) => handleParcelChange('length', e.target.value)} /></label>
                            <label>Width<input type='number' min='0' step='0.01' value={parcel.width} onChange={(e) => handleParcelChange('width', e.target.value)} /></label>
                            <label>Height<input type='number' min='0' step='0.01' value={parcel.height} onChange={(e) => handleParcelChange('height', e.target.value)} /></label>
                            <label>Unit
                                <select value={parcel.distance_unit} onChange={(e) => handleParcelChange('distance_unit', e.target.value)}>
                                    <option value='in'>inches</option>
                                    <option value='cm'>cm</option>
                                    <option value='ft'>feet</option>
                                    <option value='mm'>mm</option>
                                    <option value='m'>m</option>
                                </select>
                            </label>
                            <label>Weight<input type='number' min='0' step='0.01' value={parcel.weight} onChange={(e) => handleParcelChange('weight', e.target.value)} /></label>
                            <label>Mass Unit
                                <select value={parcel.mass_unit} onChange={(e) => handleParcelChange('mass_unit', e.target.value)}>
                                    <option value='lb'>lb</option>
                                    <option value='oz'>oz</option>
                                    <option value='kg'>kg</option>
                                    <option value='g'>g</option>
                                </select>
                            </label>
                        </div>
                        <div className={styles.shippoActions}>
                            <button
                                type='button'
                                onClick={handleGetRates}
                                className={styles.shippoPrimaryBtn}
                                disabled={ratesLoading || !shippoConfigured || !selectedCustomerId}
                            >
                                <FaSyncAlt /> {ratesLoading ? 'Fetching rates…' : 'Get Rates'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* ============================================================
                    Customs Declaration
                    ------------------------------------------------------------
                    Only strictly required for international shipments, but the
                    user can enable it manually too (Shippo ignores it for
                    domestic shipments). Items feed a Shippo customs declaration
                    that's attached when we create the shipment.
                ============================================================ */}
                <div className={styles.shippoBlock} style={{ marginTop: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                        <h4 className={styles.shippoBlockTitle} style={{ margin: 0 }}>
                            <FaGlobe /> Customs Declaration
                            {shipFrom.country && shipTo.country && shipFrom.country !== shipTo.country && (
                                <span style={{ fontSize: 12, marginLeft: 8, color: '#b45309' }}>
                                    (required for international)
                                </span>
                            )}
                        </h4>
                        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                            <input
                                type='checkbox'
                                checked={Boolean(customs.enabled)}
                                onChange={(e) => handleCustomsChange('enabled', e.target.checked)}
                            />
                            Enable customs
                        </label>
                    </div>

                    {customs.enabled && (
                        <>
                            <div className={styles.shippoGrid} style={{ marginTop: 10 }}>
                                <label>Contents Type
                                    <select
                                        value={customs.contentsType}
                                        onChange={(e) => handleCustomsChange('contentsType', e.target.value)}
                                    >
                                        <option value='MERCHANDISE'>Merchandise</option>
                                        <option value='GIFT'>Gift</option>
                                        <option value='DOCUMENTS'>Documents</option>
                                        <option value='RETURNED_GOODS'>Returned Goods</option>
                                        <option value='SAMPLE'>Sample</option>
                                        <option value='HUMANITARIAN_DONATION'>Humanitarian Donation</option>
                                        <option value='OTHER'>Other</option>
                                    </select>
                                </label>
                                {customs.contentsType === 'OTHER' && (
                                    <label>Contents Explanation
                                        <input
                                            value={customs.contentsExplanation || ''}
                                            onChange={(e) => handleCustomsChange('contentsExplanation', e.target.value)}
                                        />
                                    </label>
                                )}
                                <label>Non-Delivery Option
                                    <select
                                        value={customs.nonDeliveryOption}
                                        onChange={(e) => handleCustomsChange('nonDeliveryOption', e.target.value)}
                                    >
                                        <option value='RETURN'>Return</option>
                                        <option value='ABANDON'>Abandon</option>
                                    </select>
                                </label>
                                <label>Incoterm (optional)
                                    <select
                                        value={customs.incoterm || ''}
                                        onChange={(e) => handleCustomsChange('incoterm', e.target.value)}
                                    >
                                        <option value=''>—</option>
                                        <option value='DDP'>DDP (Delivered Duty Paid)</option>
                                        <option value='DDU'>DDU (Delivered Duty Unpaid)</option>
                                        <option value='FCA'>FCA (Free Carrier)</option>
                                    </select>
                                </label>
                                <label>Certify Signer
                                    <input
                                        value={customs.certifySigner || ''}
                                        onChange={(e) => handleCustomsChange('certifySigner', e.target.value)}
                                        placeholder='Name of the person certifying'
                                    />
                                </label>
                                <label>EEL / PFC (optional)
                                    <input
                                        value={customs.eelPfc || ''}
                                        onChange={(e) => handleCustomsChange('eelPfc', e.target.value)}
                                        placeholder='e.g. NOEEI_30_37_a'
                                    />
                                </label>
                                <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <input
                                        type='checkbox'
                                        checked={customs.certify !== false}
                                        onChange={(e) => handleCustomsChange('certify', e.target.checked)}
                                    />
                                    I certify this declaration is accurate
                                </label>
                            </div>

                            <div style={{ marginTop: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <strong>Items</strong>
                                <button
                                    type='button'
                                    className={styles.shippoSecondaryBtn}
                                    onClick={addCustomsItem}
                                >
                                    <FaPlus /> Add Item
                                </button>
                            </div>

                            {customs.items.length === 0 ? (
                                <div style={{ padding: 12, color: '#6b7280', fontStyle: 'italic' }}>
                                    No customs items yet. Add one per distinct product you're shipping.
                                </div>
                            ) : (
                                <div className={styles.tableContainer}>
                                    <table className={styles.itemsTable}>
                                        <thead>
                                            <tr>
                                                <th>Description</th>
                                                <th>Qty</th>
                                                <th>Net Weight</th>
                                                <th>Mass Unit</th>
                                                <th>Value</th>
                                                <th>Currency</th>
                                                <th>Origin</th>
                                                <th>HS Tariff #</th>
                                                <th>SKU</th>
                                                <th></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {customs.items.map((it, idx) => (
                                                <tr key={idx}>
                                                    <td>
                                                        <input
                                                            className={styles.tableInput}
                                                            value={it.description || ''}
                                                            onChange={(e) => handleCustomsItemChange(idx, 'description', e.target.value)}
                                                        />
                                                    </td>
                                                    <td style={{ width: 70 }}>
                                                        <input
                                                            className={styles.tableInput}
                                                            type='number'
                                                            min='1'
                                                            value={it.quantity || 1}
                                                            onChange={(e) => handleCustomsItemChange(idx, 'quantity', Number(e.target.value))}
                                                        />
                                                    </td>
                                                    <td style={{ width: 90 }}>
                                                        <input
                                                            className={styles.tableInput}
                                                            type='number'
                                                            step='0.01'
                                                            value={it.netWeight || ''}
                                                            onChange={(e) => handleCustomsItemChange(idx, 'netWeight', e.target.value)}
                                                        />
                                                    </td>
                                                    <td style={{ width: 80 }}>
                                                        <select
                                                            className={styles.tableInput}
                                                            value={it.massUnit || 'lb'}
                                                            onChange={(e) => handleCustomsItemChange(idx, 'massUnit', e.target.value)}
                                                        >
                                                            <option value='lb'>lb</option>
                                                            <option value='oz'>oz</option>
                                                            <option value='kg'>kg</option>
                                                            <option value='g'>g</option>
                                                        </select>
                                                    </td>
                                                    <td style={{ width: 90 }}>
                                                        <input
                                                            className={styles.tableInput}
                                                            type='number'
                                                            step='0.01'
                                                            value={it.valueAmount || ''}
                                                            onChange={(e) => handleCustomsItemChange(idx, 'valueAmount', e.target.value)}
                                                        />
                                                    </td>
                                                    <td style={{ width: 80 }}>
                                                        <input
                                                            className={styles.tableInput}
                                                            maxLength={3}
                                                            value={it.valueCurrency || 'USD'}
                                                            onChange={(e) => handleCustomsItemChange(idx, 'valueCurrency', e.target.value.toUpperCase())}
                                                        />
                                                    </td>
                                                    <td style={{ width: 70 }}>
                                                        <input
                                                            className={styles.tableInput}
                                                            maxLength={2}
                                                            value={it.originCountry || 'US'}
                                                            onChange={(e) => handleCustomsItemChange(idx, 'originCountry', e.target.value.toUpperCase())}
                                                        />
                                                    </td>
                                                    <td>
                                                        <input
                                                            className={styles.tableInput}
                                                            value={it.tariffNumber || ''}
                                                            onChange={(e) => handleCustomsItemChange(idx, 'tariffNumber', e.target.value)}
                                                            placeholder='Optional'
                                                        />
                                                    </td>
                                                    <td>
                                                        <input
                                                            className={styles.tableInput}
                                                            value={it.skuCode || ''}
                                                            onChange={(e) => handleCustomsItemChange(idx, 'skuCode', e.target.value)}
                                                        />
                                                    </td>
                                                    <td>
                                                        <button
                                                            type='button'
                                                            className={styles.deleteButton}
                                                            onClick={() => removeCustomsItem(idx)}
                                                            title='Remove item'
                                                            style={{ padding: '4px 8px', fontSize: 12 }}
                                                        >
                                                            <FaTrash />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Rates table */}
                {rates.length > 0 && (
                    <div className={styles.ratesSection}>
                        <h4 className={styles.shippoBlockTitle}>Available Rates</h4>
                        <div className={styles.tableContainer}>
                            <table className={styles.itemsTable}>
                                <thead>
                                    <tr>
                                        <th style={{ width: 40 }}></th>
                                        <th>Carrier</th>
                                        <th>Service</th>
                                        <th>Days</th>
                                        <th>Amount</th>
                                        <th>Attributes</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rates.map(r => (
                                        <tr
                                            key={r.object_id}
                                            className={selectedRateId === r.object_id ? styles.rateRowSelected : ''}
                                            onClick={() => setSelectedRateId(r.object_id)}
                                            style={{ cursor: 'pointer' }}
                                        >
                                            <td>
                                                <input
                                                    type='radio'
                                                    name='shippoRate'
                                                    checked={selectedRateId === r.object_id}
                                                    onChange={() => setSelectedRateId(r.object_id)}
                                                />
                                            </td>
                                            <td>
                                                {r.provider_image_75 && (
                                                    <img src={r.provider_image_75} alt={r.provider} className={styles.carrierLogo} />
                                                )}
                                                {r.provider}
                                            </td>
                                            <td>{r.servicelevel?.name || r.servicelevel?.token}</td>
                                            <td>{r.estimated_days != null ? `${r.estimated_days} day(s)` : '—'}</td>
                                            <td><strong>{r.currency} {r.amount}</strong></td>
                                            <td>{(r.attributes || []).join(', ') || '—'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className={styles.shippoActions}>
                            <button
                                type='button'
                                onClick={handleBuyLabel}
                                className={styles.shippoPrimaryBtn}
                                disabled={!selectedRateId || labelLoading}
                            >
                                {labelLoading ? 'Purchasing…' : 'Buy Label'}
                            </button>
                        </div>
                    </div>
                )}

                {/* Label + tracking card — shown once a label has been purchased. */}
                {(labelInfo.labelUrl || labelInfo.trackingNumber) && (
                    <div className={styles.labelCard}>
                        <div className={styles.labelCardHeader}>
                            <h4>Shipment Purchased</h4>
                            <span className={styles.labelStatusBadge} data-status={labelInfo.trackingStatus || 'UNKNOWN'}>
                                {labelInfo.trackingStatus || 'PENDING'}
                            </span>
                        </div>
                        <div className={styles.labelCardGrid}>
                            <div><strong>Carrier:</strong> {labelInfo.carrier || '—'}</div>
                            <div><strong>Service:</strong> {labelInfo.serviceLevelName || labelInfo.serviceLevel || '—'}</div>
                            <div><strong>Cost:</strong> {labelInfo.shippingCost ? `${labelInfo.shippingCurrency || ''} ${labelInfo.shippingCost}` : '—'}</div>
                            <div><strong>Tracking #:</strong> {labelInfo.trackingNumber || '—'}</div>
                        </div>
                        <div className={styles.shippoActions}>
                            <button
                                type='button'
                                className={styles.shippoPrimaryBtn}
                                onClick={handlePrintLabel}
                                disabled={!labelInfo.labelUrl}
                            >
                                <FaPrint /> Print Label
                            </button>
                            {labelInfo.commercialInvoiceUrl && (
                                <a
                                    href={labelInfo.commercialInvoiceUrl}
                                    target='_blank'
                                    rel='noopener noreferrer'
                                    className={styles.shippoSecondaryBtn}
                                >
                                    Commercial Invoice
                                </a>
                            )}
                            <button
                                type='button'
                                className={styles.shippoDangerBtn}
                                onClick={handleRefundLabel}
                                disabled={refundLoading || !labelInfo.shippoTransactionId}
                            >
                                <FaUndo /> {refundLoading ? 'Refunding…' : 'Refund Label'}
                            </button>
                        </div>

                        {/* Full in-app tracking experience embedded inline.
                            Status badge, stepper, route card, meta grid, and a
                            vertical event timeline — with auto-refresh while the
                            package is in flight. */}
                        <div id='tracking-section' className={styles.inlineTrackingWrap}>
                            <TrackingView shippingId={id} />
                        </div>
                    </div>
                )}
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
