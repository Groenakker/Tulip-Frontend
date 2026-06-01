import React, { useState, useEffect, useRef } from 'react';
import WhiteIsland from '../../../components/Whiteisland';
import styles from './SSDetails.module.css';
import { FaSave, FaTrash, FaImage, FaEdit, FaChevronDown, FaChevronUp } from "react-icons/fa";
import Modal from '../../../components/Modal';
import SignatureCanvas from 'react-signature-canvas';
import toast from '../../../components/Toaster/toast';
import TestCodeChecklist from '../../../components/modals/TestCodeChecklist';
import TariffCodePicker from '../../../components/TariffCodePicker/TariffCodePicker';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import Header from '../../../components/Header';
export default function SSDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const isEdit = Boolean(id && id !== 'add');

    //image modal
    const [viewingImage, setViewingImage] = useState(null);
    const [showTestCodeModal, setShowTestCodeModal] = useState(false);

    // Contact type options - default options + custom values from localStorage
    const getContactTypeOptions = () => {
        const defaultOptions = ['Tissue / Bone', 'Blood', 'Skin'];
        const storedOptions = localStorage.getItem('contactTypeOptions');
        if (storedOptions) {
            try {
                const parsed = JSON.parse(storedOptions);
                // Merge and remove duplicates
                return [...new Set([...defaultOptions, ...parsed])];
            } catch (e) {
                return defaultOptions;
            }
        }
        return defaultOptions;
    };

    const [contactTypeOptions, setContactTypeOptions] = useState(getContactTypeOptions());
    const [showContactTypeDropdown, setShowContactTypeDropdown] = useState(false);
    const contactTypeInputRef = useRef(null);
    const contactTypeDropdownRef = useRef(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (
                contactTypeDropdownRef.current &&
                !contactTypeDropdownRef.current.contains(event.target) &&
                contactTypeInputRef.current &&
                !contactTypeInputRef.current.contains(event.target)
            ) {
                setShowContactTypeDropdown(false);
            }
        };

        if (showContactTypeDropdown) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showContactTypeDropdown]);

    const sigCanvas = useRef({});
    const [signatureData, setSignatureData] = useState({
        signature: null
    });
    const handleAddTest = () => {
        setShowTestCodeModal(true);
    };

    const handleTestSelected = (selectedTests) => {
        // Add selected tests to the tests array
        const newTests = selectedTests.map((test, index) => ({
            id: Date.now() + index, // Generate unique ID
            testCodeId: test._id || test.id,
            grkCode: test.code || test.grkCode || '',
            description: test.descriptionLong || test.descriptionShort || test.description || '',
            samplesSubmitted: '',
            extractionTime: '',
            extractionTemp: '',
            quality: 'GLP',
            category: test.category || '',
            extractBased: test.extractBased || ''
        }));
        setTests(prev => [...prev, ...newTests]);
        setShowTestCodeModal(false);
    };

    const handleRemoveTest = (testId) => {
        setTests(prev => prev.filter(t => t.id !== testId));
    };

    // Partners and Projects state
    const [partners, setPartners] = useState([]);
    const [projects, setProjects] = useState([]);
    const [filteredProjects, setFilteredProjects] = useState([]);

    // Suggested fields scraped from the linked Business Partner's
    // sample documents. When a sponsor uploads a TRF / TIDS / PCF
    // template on the BP, the backend's document scanner records
    // labels it didn't recognise as schema fields. Those land in
    // `bpCustomCandidates` so the user can promote them to
    // sample.customFields with one click.
    const [bpCandidates, setBpCandidates] = useState([]);
    const [bpCandidatesLoading, setBpCandidatesLoading] = useState(false);
    const [showBpCandidates, setShowBpCandidates] = useState(true);

    //Sample info data
    const [sample, setSample] = useState({
        company_id: user?.companyId || '',
        bPartnerCode: '',
        bPartnerID: '',
        projectID: '',
        projectName: '',
        status: '',
        bPartnerName: '',
        address: '',
        contactName: '',
        email: '',
        phone: '',
        image: null,
        sampleCode: '',
        name: '',
        sampleDescription: '',
        intendedUse: '',
        partNumber: '',
        lotNumber: '',
        devicesUsed: '1',
        countryOrigin: '',
        sampleMass: '',
        surfaceArea: '',
        // Customs / export classification
        tariffCode: '',
        tariffDescription: '',
        customsValue: '',
        contactType: '',
        contactDuration: '',
        manufacturer: '',
        desiredMarkets: '',
        manufactureDate: '',
        expirationDate: '',
        wallThickness: '',
        extractionRatios: '',
        sampleSterile: '',
        sterilizationMethod: '',
        appearance: '',
        deviceType: '', // Radio options: Device, Solid, Liquid, Gel
        materialsOfConstruction: '',

        // Extra info
        shippingCondition: '',
        sampleStorage: '',
        sampleDisposition: '',
        safetyPrecautions: '',
        sampleImages: {
            general: null,
            labeling: null
        },
        
        // Additional fields from schema
        SAPid: '',
        poNumber: '',
        poDate: '',
        quoteNumber: '',
        salesOrderNumber: '',
        signatureImage: '',
        startDate: '',
        endDate: '',
        actDate: '',
        estDate: '',
        commitDate: '',

        // Extended TRF / TIDS / PCF fields — mined from the
        // reference sponsor templates (Geneva Labs, Bureau Veritas,
        // Accuprec, Eurofins/PSL). All optional; kept here so the
        // form always renders even when the schema is empty.
        studyCompliance: '',
        batchNumber: '',
        serialNumber: '',
        chemicalName: '',
        casNumber: '',
        molecularFormula: '',
        molecularWeight: '',
        productColor: '',
        pH: '',
        purityConcentration: '',
        density: '',
        solubility: '',
        composition: '',
        productType: '',
        methodOfManufacturing: '',
        sterilizationDate: '',
        sterilizedBy: '',
        extractionMethod: '',
        polarVehicle: '',
        nonPolarVehicle: '',
        extractionTemperature: '',
        samplesPooled: '',
        canBeCut: '',
        biohazard: '',
        surfaceAreaDirect: '',
        surfaceAreaIndirect: '',
        netWeightTotal: '',
        netWeightDirect: '',
        netWeightIndirect: '',
        predicateDevice: '',
        absorptionCheck: '',
        msdsAttached: '',
        coaAttached: '',
        cadDrawingsAttached: '',
        productStable: '',
        doseFormulationAnalysisRequired: '',
        mdrClassification: '',
        mdrRule: '',
        indianMdrClass: '',
        fdaClassification: '',
        bodyContactNature: '',
        packagingDetails: '',
        totalQuantitySupplied: '',
        numberOfSamplesShipped: '',
        supplierName: '',
        transportationDetails: '',
        handlingRequirements: '',
        testArticleNameForReport: '',
        vatNumber: '',
        mailingList: '',
        controlArticle: '',
        specialInstructions: '',
        solventForMoistening: '',
        sampleStability: '',
        sponsorRepresentative: '',
        sponsorSignatureDate: '',
        customFields: [],
    });


    //Requested tests data
    const [tests, setTests] = useState([]);



    //Requested test extra data
    const [testMetadata, setTestMetadata] = useState({
        totalSamplesSubmitted: '',
        serviceLevel: 'Standard',
        notes: ''
    });

    // Instance inventory tracking state
    const [instances, setInstances] = useState([]);
    const [movements, setMovements] = useState([]);
    const [loadingInventory, setLoadingInventory] = useState(false);
    const [expandedInstance, setExpandedInstance] = useState(null);


    // Handle image change for sample images
    const handleSampleImageChange = (type, e) => {
        const file = e.target.files[0];
        if (file) {
            setSample(prev => ({
                ...prev,
                sampleImages: {
                    ...prev.sampleImages,
                    [type]: URL.createObjectURL(file)
                }
            }));
        }
    };

    // Handle change for other sample fields
    const handleChange = (e) => {
        const { name, value } = e.target;
        setSample(prev => ({ ...prev, [name]: value }));
    };

    // ============================================================
    // Custom Fields
    // ------------------------------------------------------------
    // sample.customFields holds dynamic key/value pairs that the
    // user adopted from a BP-uploaded document. They round-trip
    // through the schema (see samples.models.js -> customFields).
    //
    // - `handleAddCustomField` adds a blank row or a row pre-
    //   populated from a BP suggestion (label + sample value).
    // - `handleCustomFieldChange` edits a row in place.
    // - `handleRemoveCustomField` drops it (it stays gone after
    //   save).
    // ============================================================
    const normalizeKey = (s) => (s || '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');

    const handleAddCustomField = (preset = {}) => {
        const label = preset.label || 'New Field';
        const key = preset.key || normalizeKey(label) || `field_${Date.now()}`;
        // Don't add a duplicate of an existing custom field.
        if ((sample.customFields || []).some((f) => f.key === key)) {
            toast.warning('Field already added');
            return;
        }
        setSample(prev => ({
            ...prev,
            customFields: [
                ...(prev.customFields || []),
                {
                    key,
                    label,
                    value: preset.value || '',
                    sourceBPartnerId: preset.sourceBPartnerId || prev.bPartnerID || undefined,
                    sourceDocumentId: preset.sourceDocumentId || undefined,
                },
            ],
        }));
    };

    const handleCustomFieldChange = (key, field, value) => {
        setSample(prev => ({
            ...prev,
            customFields: (prev.customFields || []).map((f) =>
                f.key === key ? { ...f, [field]: value } : f
            ),
        }));
    };

    const handleRemoveCustomField = (key) => {
        setSample(prev => ({
            ...prev,
            customFields: (prev.customFields || []).filter((f) => f.key !== key),
        }));
    };

    // Load BP-suggested candidate fields whenever the linked
    // partner changes. Only pulls candidates from the partner's
    // CURRENT working version of their sample document (the one
    // flagged isCurrent on the BP). Older uploaded versions stay
    // as history but no longer contribute custom-field
    // suggestions, so editing the BP's current version is the
    // single lever that controls what shows up here.
    useEffect(() => {
        const bpId = sample.bPartnerID;
        if (!bpId) {
            setBpCandidates([]);
            return;
        }
        setBpCandidatesLoading(true);
        (async () => {
            try {
                const res = await fetch(
                    `${import.meta.env.VITE_BACKEND_URL}/api/bpartners/${bpId}/documents`,
                    { credentials: 'include' }
                );
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const data = await res.json();
                const docs = data.documents || [];
                // Find the current working version; legacy BPs without
                // an isCurrent flag fall back to the newest upload so
                // the suggestion list never silently disappears.
                let currentDoc = docs.find((d) => d.isCurrent);
                if (!currentDoc && docs.length > 0) {
                    currentDoc = [...docs].sort((a, b) => {
                        const at = a.uploadedAt ? new Date(a.uploadedAt).getTime() : 0;
                        const bt = b.uploadedAt ? new Date(b.uploadedAt).getTime() : 0;
                        return bt - at;
                    })[0];
                }
                const seen = new Map();
                if (currentDoc) {
                    for (const field of currentDoc.detectedFields || []) {
                        if (field.matchStatus !== 'custom') continue;
                        const k = field.normalizedKey || normalizeKey(field.label);
                        if (!k) continue;
                        if (seen.has(k)) continue;
                        seen.set(k, {
                            key: k,
                            label: field.label,
                            sampleValue: field.sampleValue || '',
                            sourceDocumentId: currentDoc._id,
                            sourceFilename: currentDoc.filename,
                            sourceBPartnerId: bpId,
                        });
                    }
                }
                setBpCandidates(Array.from(seen.values()));
            } catch (err) {
                console.error('Failed to load BP candidate fields:', err);
                setBpCandidates([]);
            } finally {
                setBpCandidatesLoading(false);
            }
        })();
    }, [sample.bPartnerID]);

    // Handle partner code change
    const handlePartnerChange = async (e) => {
        const selectedCode = e.target.value;
        const selectedPartner = partners.find(p => p.partnerNumber === selectedCode);
        
        setSample(prev => ({
            ...prev,
            bPartnerCode: selectedCode,
            bPartnerID: selectedPartner ? selectedPartner._id : '',
            bPartnerName: selectedPartner ? selectedPartner.name : '',
            // Clear project when partner changes
            projectID: '',
            projectName: ''
        }));
    };

    // Handle project change
    const handleProjectChange = async (e) => {
        const selectedProjectId = e.target.value;
        const selectedProject = filteredProjects.find(p => 
            p._id === selectedProjectId || 
            p.projectID === selectedProjectId ||
            p.projectCode === selectedProjectId
        );
        
        if (selectedProject) {
            // Fetch partner details if bPartnerID exists
            let partnerData = null;
            if (selectedProject.bPartnerID) {
                try {
                    const partnerRes = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/bpartners/${selectedProject.bPartnerID}`);
                    if (partnerRes.ok) {
                        partnerData = await partnerRes.json();
                    }
                } catch (err) {
                    console.error('Failed to fetch partner:', err);
                }
            }
            
            // Build address from partner data
            let address = '';
            if (partnerData) {
                const addrParts = [
                    partnerData.address1,
                    partnerData.address2,
                    partnerData.city,
                    partnerData.state,
                    partnerData.zip,
                    partnerData.country
                ].filter(Boolean);
                address = addrParts.join(', ');
            }
            
            // Get contact/sponsor from project or partner
            let sponsor = '';
            if (selectedProject.contact) {
                sponsor = selectedProject.contact;
            } else if (partnerData?.contacts && partnerData.contacts.length > 0) {
                sponsor = partnerData.contacts[0].name || partnerData.contacts[0].email || '';
            }
            
            setSample(prev => ({
                ...prev,
                projectID: selectedProject._id || selectedProject.projectID || selectedProject.projectCode || '',
                projectName: selectedProject.description || selectedProject.name || '',
                bPartnerCode: selectedProject.bPartnerCode || (partnerData ? partnerData.partnerNumber : prev.bPartnerCode),
                bPartnerID: selectedProject.bPartnerID || (partnerData ? partnerData._id : prev.bPartnerID),
                bPartnerName: partnerData ? partnerData.name : prev.bPartnerName,
                address: address || prev.address,
                email: partnerData ? (partnerData.email || prev.email) : prev.email,
                phone: partnerData ? (partnerData.phone || prev.phone) : prev.phone,
                contactName: sponsor || prev.contactName
            }));
        } else {
            setSample(prev => ({
                ...prev,
                projectID: selectedProjectId,
                projectName: ''
            }));
        }
    };

    // Handle contact type change
    const handleContactTypeChange = (e) => {
        const value = e.target.value;
        setSample(prev => ({ ...prev, contactType: value }));
        setShowContactTypeDropdown(false);
    };

    // Handle contact type input change
    const handleContactTypeInputChange = (e) => {
        const value = e.target.value;
        setSample(prev => ({ ...prev, contactType: value }));
        setShowContactTypeDropdown(true);
    };

    // Filter options based on input
    const filteredContactTypeOptions = contactTypeOptions.filter(option =>
        option.toLowerCase().includes((sample.contactType || '').toLowerCase())
    );

    const handleSave = async () => {
        try {
            // If contactType has a custom value not in options, add it to options
            if (sample.contactType && !contactTypeOptions.includes(sample.contactType)) {
                const updatedOptions = [...contactTypeOptions, sample.contactType];
                setContactTypeOptions(updatedOptions);
                // Store in localStorage for persistence
                const customOptions = updatedOptions.filter(opt => 
                    !['Tissue / Bone', 'Blood', 'Skin'].includes(opt)
                );
                localStorage.setItem('contactTypeOptions', JSON.stringify(customOptions));
            }

            const payload = {
                ...sample,
                company_id: sample.company_id || user?.companyId || '',
                status: sample.status || 'Draft',
                description: sample.sampleDescription,
                name: sample.name || sample.sampleDescription || '',
                signatureImage: sample.signatureImage || signatureData.signature || '',
                requestedTests: tests.filter(t => t.grkCode || t.description), // Only save tests with data
                testMetadata: testMetadata
            };
            
            if (isEdit) {
                // Update existing sample (PUT)
                const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/samples/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                
                if (!res.ok) throw new Error('Failed to save');
                toast.success('Sample saved!');
            } else {
                // Create new sample (POST)
                const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/samples`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                
                if (!res.ok) throw new Error('Failed to save');
                
                const saved = await res.json();
                toast.success('Sample saved!');
                
                // Navigate to the saved sample's ID
                if (saved._id) {
                    navigate(`/SampleSubmission/SSDetail/${saved._id}`, { replace: true });
                }
            }
        } catch (e) {
            console.error('Error saving sample:', e);
            toast.error('Failed to save sample');
        }
    };

    const handleDelete = async () => {
        if (id === 'add') {
            navigate('/SampleSubmission');
            return;
        }
        if (!window.confirm('Are you sure you want to delete this sample?')) return;
        
        try {
            const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/samples/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed to delete');
            toast.warning('Sample deleted!');
            navigate('/SampleSubmission');
        } catch (e) {
            console.error('Error deleting sample:', e);
            toast.error('Failed to delete sample');
        }
    };

    // Handle change for sample image
    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setSample(prev => ({ ...prev, image: URL.createObjectURL(file) }));
        }
    };

    // Function to adjust input area height
    const adjustTextareaHeight = (element) => {
        if (!element) return;
        element.style.height = 'auto';
        element.style.height = `${element.scrollHeight}px`;
    };

    // Fetch partners for user's company
    useEffect(() => {
        const fetchPartners = async () => {
            if (!user?.companyId) return;
            try {
                const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/bpartners?companyId=${user.companyId}`);
                if (res.ok) {
                    const data = await res.json();
                    setPartners(data);
                }
            } catch (err) {
                console.error('Failed to fetch partners:', err);
            }
        };
        fetchPartners();
    }, [user?.companyId]);

    // Fetch projects for user's company
    useEffect(() => {
        const fetchProjects = async () => {
            if (!user?.companyId) return;
            try {
                const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/projects?companyId=${user.companyId}`);
                if (res.ok) {
                    const data = await res.json();
                    setProjects(data);
                    setFilteredProjects(data); // Initially show all projects
                }
            } catch (err) {
                console.error('Failed to fetch projects:', err);
            }
        };
        fetchProjects();
    }, [user?.companyId]);

    // Filter projects based on selected partner
    useEffect(() => {
        if (sample.bPartnerCode) {
            const selectedPartner = partners.find(p => p.partnerNumber === sample.bPartnerCode);
            if (selectedPartner) {
                const filtered = projects.filter(p => 
                    p.bPartnerID === selectedPartner._id || 
                    p.bPartnerCode === selectedPartner.partnerNumber
                );
                setFilteredProjects(filtered);
            } else {
                setFilteredProjects([]);
            }
        } else {
            // Show all projects when partner is empty
            setFilteredProjects(projects);
        }
    }, [sample.bPartnerCode, partners, projects]);

    // Load data and trigger textarea height adjustment
    useEffect(() => {
        const load = async () => {
            try {
                if (id && id !== 'add') {
                    const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/samples/${id}`);
                    if (res.ok) {
                        const data = await res.json();
                        // Map backend data to frontend state
                        const formData = data.formData || {};
                        
                        // Merge formData with top-level data, prioritizing formData
                        const mergedData = {
                            ...data,
                            ...formData,
                            // Override with formData values if they exist
                            company_id: formData.company_id || data.company_id || data.companyId || user?.companyId || '',
                            bPartnerCode: formData.bPartnerCode || data.bPartnerCode || '',
                            bPartnerID: formData.bPartnerID || data.bPartnerID || '',
                            projectID: formData.projectID || data.projectID || '',
                            status: data.status || formData.status || 'Draft',
                            bPartnerName: formData.bPartnerName || data.bPartnerName || '',
                            sampleCode: formData.sampleCode || data.sampleCode || '',
                            name: formData.name || data.name || '',
                            sampleDescription: data.description || formData.sampleDescription || '',
                            image: data.image || formData.image || null,
                            sampleImages: formData.sampleImages || data.sampleImages || { general: null, labeling: null },
                            SAPid: formData.SAPid || data.SAPid || '',
                            poNumber: formData.poNumber || data.poNumber || '',
                            poDate: formData.poDate || data.poDate || '',
                            quoteNumber: formData.quoteNumber || data.quoteNumber || '',
                            salesOrderNumber: formData.salesOrderNumber || data.salesOrderNumber || '',
                            signatureImage: formData.signatureImage || data.signatureImage || '',
                            startDate: formData.startDate || data.startDate || '',
                            endDate: formData.endDate || data.endDate || '',
                            actDate: formData.actDate || data.actDate || '',
                            estDate: formData.estDate || data.estDate || '',
                            commitDate: formData.commitDate || data.commitDate || ''
                        };
                        
                        // Load contact type options and add loaded contactType if it's custom
                        const loadedContactType = mergedData.contactType || '';
                        if (loadedContactType) {
                            const currentOptions = getContactTypeOptions();
                            if (!currentOptions.includes(loadedContactType)) {
                                const updatedOptions = [...currentOptions, loadedContactType];
                                setContactTypeOptions(updatedOptions);
                                // Store in localStorage
                                const customOptions = updatedOptions.filter(opt => 
                                    !['Tissue / Bone', 'Blood', 'Skin'].includes(opt)
                                );
                                localStorage.setItem('contactTypeOptions', JSON.stringify(customOptions));
                            } else {
                                setContactTypeOptions(currentOptions);
                            }
                        } else {
                            setContactTypeOptions(getContactTypeOptions());
                        }
                        
                        // Set sample state with defaults for missing fields
                        setSample(prev => ({
                            company_id: user?.companyId || '',
                            bPartnerCode: '',
                            bPartnerID: '',
                            projectID: '',
                            projectName: '',
                            status: 'Draft',
                            bPartnerName: '',
                            address: '',
                            contactName: '',
                            email: '',
                            phone: '',
                            image: null,
                            sampleCode: '',
                            name: '',
                            sampleDescription: '',
                            intendedUse: '',
                            partNumber: '',
                            lotNumber: '', 
                            devicesUsed: '1',
                            countryOrigin: '',
                            sampleMass: '',
                            surfaceArea: '',
                            tariffCode: '',
                            tariffDescription: '',
                            customsValue: '',
                            contactType: loadedContactType || '',
                            contactDuration: '',
                            manufacturer: '',
                            desiredMarkets: 'U',
                            manufactureDate: '',
                            expirationDate: '',
                            wallThickness: '',
                            extractionRatios: '',
                            sampleSterile: '',
                            sterilizationMethod: '',
                            appearance: '',
                            deviceType: '',
                            materialsOfConstruction: '',
                            shippingCondition: '',
                            sampleStorage: '',
                            sampleDisposition: '',
                            safetyPrecautions: '',
                            sampleImages: {
                                general: null,
                                labeling: null
                            },
                            SAPid: '',
                            poNumber: '',
                            poDate: '',
                            quoteNumber: '',
                            salesOrderNumber: '',
                            signatureImage: '',
                            startDate: '',
                            endDate: '',
                            actDate: '',
                            estDate: '',
                            commitDate: '',
                            ...mergedData
                        }));
                        
                        // Load requested tests if they exist
                        if (data.requestedTests && Array.isArray(data.requestedTests) && data.requestedTests.length > 0) {
                            // Ensure each test has an id
                            const testsWithIds = data.requestedTests.map((test, index) => ({
                                ...test,
                                id: test.id || Date.now() + index
                            }));
                            setTests(testsWithIds);
                        } else {
                            setTests([]);
                        }
                        
                        // Load test metadata if it exists
                        if (data.testMetadata) {
                            setTestMetadata({
                                totalSamplesSubmitted: data.testMetadata.totalSamplesSubmitted || '',
                                serviceLevel: data.testMetadata.serviceLevel || 'Standard',
                                notes: data.testMetadata.notes || ''
                            });
                        } else {
                            setTestMetadata({
                                totalSamplesSubmitted: '',
                                serviceLevel: 'Standard',
                                notes: ''
                            });
                        }
                    }
                } else if (id === 'add') {
                    // Reset to empty state for new sample
                    setSample({
                        company_id: user?.companyId || '',
                        bPartnerCode: '',
                        bPartnerID: '',
                        projectID: '',
                        projectName: '',
                        status: 'Draft',
                        bPartnerName: '',
                        address: '',
                        contactName: '',
                        email: '',
                        phone: '',
                        image: null,
                        sampleCode: '',
                        sampleDescription: '',
                        intendedUse: '',
                        partNumber: '',
                        lotNumber: '',
                        devicesUsed: '1',
                        countryOrigin: '',
                        sampleMass: '',
                        surfaceArea: '',
                        tariffCode: '',
                        tariffDescription: '',
                        customsValue: '',
                        contactType: '',
                        contactDuration: '',
                        manufacturer: '',
                        desiredMarkets: 'U',
                        manufactureDate: '',
                        expirationDate: '',
                        wallThickness: '',
                        extractionRatios: '',
                        sampleSterile: '',
                        sterilizationMethod: '',
                        appearance: '',
                        deviceType: '',
                        materialsOfConstruction: '',
                        shippingCondition: '',
                        sampleStorage: '',
                        sampleDisposition: '',
                        safetyPrecautions: '',
                        sampleImages: {
                            general: null,
                            labeling: null
                        }
                    });
                    setTests([]);
                    setTestMetadata({
                        totalSamplesSubmitted: '',
                        serviceLevel: 'Standard',
                        notes: ''
                    });
                }
            } catch (e) { 
                console.error('Error loading sample:', e);
                toast.error('Failed to load sample data');
            }
        };
        load();
    }, [id]);

    // Adjust textarea heights after sample data changes
    useEffect(() => {
        const textareas = document.getElementsByClassName(styles.autoGrowInput);
        Array.from(textareas).forEach(textarea => {
            adjustTextareaHeight(textarea);
            textarea.addEventListener('input', (e) => adjustTextareaHeight(e.target));
        });
        return () => {
            Array.from(textareas).forEach(textarea => {
                textarea.removeEventListener('input', (e) => adjustTextareaHeight(e.target));
            });
        };
    }, [sample.materialsOfConstruction, sample.safetyPrecautions, testMetadata.notes]);


    // Fetch instances and movements for this sample
    useEffect(() => {
        if (!isEdit || !id || id === 'add') return;
        
        const fetchInventory = async () => {
            setLoadingInventory(true);
            try {
                const [instancesRes, movementsRes] = await Promise.all([
                    fetch(`${import.meta.env.VITE_BACKEND_URL}/api/instances/sample/${id}`),
                    fetch(`${import.meta.env.VITE_BACKEND_URL}/api/instance-movements/sample/${id}`)
                ]);

                if (instancesRes.ok) {
                    const data = await instancesRes.json();
                    setInstances(Array.isArray(data) ? data : []);
                }
                if (movementsRes.ok) {
                    const data = await movementsRes.json();
                    setMovements(Array.isArray(data) ? data : []);
                }
            } catch (err) {
                console.error('Error fetching inventory data:', err);
            } finally {
                setLoadingInventory(false);
            }
        };
        fetchInventory();
    }, [id, isEdit]);

    const getLatestMovementForInstance = (instanceId) => {
        const instanceMovements = movements.filter(m => 
            (m.instanceId?._id || m.instanceId) === instanceId
        );
        return instanceMovements.length > 0 ? instanceMovements[0] : null;
    };

    const getMovementsForInstance = (instanceId) => {
        return movements.filter(m => 
            (m.instanceId?._id || m.instanceId) === instanceId
        );
    };

    const getInventorySummary = () => {
        const total = instances.length;
        let received = 0, inWarehouse = 0, shipped = 0;
        const warehouseMap = {};

        instances.forEach(inst => {
            const latest = getLatestMovementForInstance(inst._id);
            const type = latest?.movementType;
            if (type === 'Shipped') shipped++;
            else if (type === 'In Warehouse') inWarehouse++;
            else received++;

            if (type === 'In Warehouse' && latest?.warehouseId) {
                const whName = latest.warehouseId?.warehouseID || latest.location || 'Unknown';
                warehouseMap[whName] = (warehouseMap[whName] || 0) + 1;
            }
        });

        return { total, received, inWarehouse, shipped, warehouseMap };
    };

    const formatMovementDate = (value) => {
        if (!value) return '';
        const d = new Date(value);
        if (isNaN(d.getTime())) return '';
        return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    //Image click handler
    const handleImageClick = (type) => () => {
        if (sample.sampleImages[type]) {
            setViewingImage({
                src: sample.sampleImages[type],
                alt: type === 'general' ? 'General Sample Image' : 'Labeling Image'
            });
        }
    }
    //Requested test handler
    const handleTestChange = (id, field, value) => {
        setTests(prevTests =>
            prevTests.map(test =>
                test.id === id ? { ...test, [field]: value } : test
            )
        );
    };

    //Requested test metadata handler
    const handleTestMetadataChange = (e) => {
        const { name, value } = e.target;
        setTestMetadata(prev => ({ ...prev, [name]: value }));
    };

    // Calculate total samples submitted
    useEffect(() => {
        const total = tests.reduce((sum, test) => {
            const num = parseInt(test.samplesSubmitted) || 0;
            return sum + num;
        }, 0);
        setTestMetadata(prev => ({ ...prev, totalSamplesSubmitted: total.toString() }));
    }, [tests]);

    //clear signature
    const clearSignature = () => {
        sigCanvas.current.clear();
        setSignatureData({ signature: null });
        setSample(prev => ({ ...prev, signatureImage: '' }));
    }

    //saving signature
    const saveSignature = () => {
        if (sigCanvas.current.isEmpty()) {
            toast.error("Please provide a signature first.");
            return;
        }
        const dataURL = sigCanvas.current.toDataURL('image/png');
        setSignatureData({ signature: dataURL });
        setSample(prev => ({ ...prev, signatureImage: dataURL }));
        toast.success("Signature saved!");
    }
    const handleSignatureInfoChange = (e) => {
        const { name, value } = e.target;
        setSignatureData(prev => ({ ...prev, [name]: value }));
    }



    return (
        <div style={{ paddingBottom: '20px' }}>
            <div className={styles.bHeading}>
                {/* <h2>Sample Submission Detail</h2> */}
                <Header title="Sample Submission Detail" />
                <div className={styles.savesTop}>
                    {id !== 'add' && (
                        <button className={styles.deleteButton} onClick={handleDelete}><FaTrash />Delete</button>
                    )}
                    <button className={styles.saveButton} onClick={handleSave}><FaSave />Save</button>
                </div>
            </div>


            <div className={styles.detailPage}>
                {/* WhiteIsland for sample information 1 */}
                <WhiteIsland className={styles.bigIsland}>
                    <h3>Client Information</h3>
                    <div className={styles.main}>
                        <div className={styles.detailContainer}>
                            {/* Details for Client Info  */}
                            <div className={styles.details}>
                                <div className={styles.info} style={{ width: '33%' }}>
                                    <div className={styles.infoDetail}>Partner Code <span style={{ color: "red" }}>*</span></div>
                                    <select 
                                        className={styles.dropdown}
                                        name="bPartnerCode" 
                                        value={sample.bPartnerCode} 
                                        onChange={handlePartnerChange}
                                    >
                                        <option value="">Select Partner</option>
                                        {partners.map(partner => (
                                            <option key={partner._id} value={partner.partnerNumber}>
                                                {partner.partnerNumber} - {partner.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className={styles.info} style={{ width: '33%' }}>
                                    <div className={styles.infoDetail}>Project <span style={{ color: "red" }}>*</span></div>
                                    <select 
                                        className={styles.dropdown}
                                        name="projectID" 
                                        value={sample.projectID} 
                                        onChange={handleProjectChange}
                                    >
                                        <option value="">Select Project</option>
                                        {filteredProjects.map(project => (
                                            <option key={project._id} value={project._id || project.projectID || project.projectCode}>
                                                {project.projectID || project.projectCode} - {project.description || project.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className={styles.info} style={{ width: '33%' }}>
                                    <div className={styles.infoDetail}>Form Status</div>
                                    <select className={styles.dropdown} name="status" value={sample.status} onChange={handleChange}>
                                        <option value="Draft">Draft</option>
                                        <option value="Submitted">Submitted</option>
                                        <option value="Accepted">Accepted</option>
                                        <option value="Rejected">Rejected</option>
                                    </select>
                                </div>
                            </div>

                            <div className={styles.details2}>
                                <div className={styles.info2} style={{ width: '100%' }}>
                                    <div className={styles.infoDetail}>Client</div>
                                    <input name="bPartnerName" value={sample.bPartnerName} onChange={handleChange} />
                                </div>
                            </div>

                            <div className={styles.details2}>
                                <div className={styles.info2} style={{ width: '100%' }}>
                                    <div className={styles.infoDetail}>Address</div>
                                    <input name="address" value={sample.address} onChange={handleChange} />
                                </div>
                            </div>

                            <div className={styles.details}>
                                <div className={styles.info} style={{ width: '33%' }}>
                                    <div className={styles.infoDetail}>Sponsor</div>
                                    <input name="contactName" value={sample.contactName} onChange={handleChange} />
                                </div>
                                <div className={styles.info} style={{ width: '33%' }}>
                                    <div className={styles.infoDetail}>Email</div>
                                    <input name="email" value={sample.email} onChange={handleChange} />
                                </div>
                                <div className={styles.info} style={{ width: '33%' }}>
                                    <div className={styles.infoDetail}>Phone</div>
                                    <input name="phone" value={sample.phone} onChange={handleChange} />
                                </div>
                            </div>
                        </div>
                        <div className={styles.picture}>
                            <img
                                src={sample.image ? sample.image : "/QRExample.png"}
                                width={128}
                                height={128}
                                alt="Partner"
                            />
                            <label className={styles.uploadButton}>
                                <FaImage /> Upload
                                <input
                                    type="file"
                                    accept="image/*"
                                    style={{ display: "none" }}
                                    onChange={handleImageChange}
                                />
                            </label>
                        </div>
                    </div>
                </WhiteIsland>


                {/* WhiteIsland for sample information 2 */}
                <WhiteIsland className={styles.bigIsland}>
                    <h3>Sample Information for : {sample.sampleCode || '(unsaved)'}</h3>
                    <div className={styles.main}>
                        <div className={styles.detailContainer}>
                            {/* details for Sample Info  */}
                            <div className={styles.details2}>
                                <div className={styles.info2} style={{ width: '100%' }}>
                                    <div className={styles.infoDetail}>Sample Description</div>
                                    <input name="sampleDescription" value={sample.sampleDescription} onChange={handleChange} />
                                </div>
                            </div>

                            <div className={styles.details2}>
                                <div className={styles.info2} style={{ width: '100%' }}>
                                    <div className={styles.infoDetail}>Intended Use</div>
                                    <input name="intendedUse" value={sample.intendedUse} onChange={handleChange} />
                                </div>
                            </div>

                            <div className={styles.details}>
                                <div className={styles.info} style={{ width: '50%' }}>
                                    <div className={styles.infoDetail}>Part #</div>
                                    <input name="partNumber" value={sample.partNumber} onChange={handleChange} />
                                </div>
                                <div className={styles.info} style={{ width: '50%' }}>
                                    <div className={styles.infoDetail}>Lot #</div>
                                    <input name="lotNumber" value={sample.lotNumber} onChange={handleChange} />
                                </div>
                            </div>

                            <div className={styles.details}>
                                <div className={styles.info} style={{ width: '25%' }}>
                                    <div className={styles.infoDetail}>Devices Clinical Used (Dc)</div>
                                    <input name="devicesUsed" value={sample.devicesUsed} onChange={handleChange} />
                                </div>
                                <div className={styles.info} style={{ width: '25%' }}>
                                    <div className={styles.infoDetail}>Sample Mass (g)</div>
                                    <input name="sampleMass" value={sample.sampleMass} onChange={handleChange} />
                                </div>
                                <div className={styles.info} style={{ width: '25%' }}>
                                    <div className={styles.infoDetail}>Surface Area (cm²)</div>
                                    <input name="surfaceArea" value={sample.surfaceArea} onChange={handleChange} />
                                </div>
                                <div className={styles.info} style={{ width: '25%' }}>
                                    <div className={styles.infoDetail}>Country of Origin</div>
                                    <input name="countryOrigin" value={sample.countryOrigin} onChange={handleChange} />
                                </div>
                            </div>

                            <div className={styles.details}>
                                <div className={styles.info} style={{ width: '20%' }}>
                                    <div className={styles.infoDetail}>Type of Contact</div>
                                    <div className={styles.customDropdownContainer}>
                                        <input
                                            ref={contactTypeInputRef}
                                            type="text"
                                            className={styles.dropdown}
                                            name="contactType"
                                            value={sample.contactType}
                                            onChange={handleContactTypeInputChange}
                                            onFocus={() => setShowContactTypeDropdown(true)}
                                            placeholder="Select or type custom value"
                                            style={{
                                                backgroundColor: '#ffffff',
                                                background: '#ffffff',
                                                color: '#000000',
                                                WebkitAppearance: 'none',
                                                MozAppearance: 'none',
                                                appearance: 'none'
                                            }}
                                        />
                                        {showContactTypeDropdown && filteredContactTypeOptions.length > 0 && (
                                            <div 
                                                ref={contactTypeDropdownRef}
                                                className={styles.customDropdownList}
                                            >
                                                {filteredContactTypeOptions.map((option, index) => (
                                                    <button
                                                        key={index}
                                                        type="button"
                                                        className={styles.customDropdownOption}
                                                        onClick={() => {
                                                            setSample(prev => ({ ...prev, contactType: option }));
                                                            setShowContactTypeDropdown(false);
                                                        }}
                                                    >
                                                        {option}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className={styles.info} style={{ width: '20%' }}>
                                    <div className={styles.infoDetail}>Duration of Contact</div>
                                    <select className={styles.dropdown} name="contactDuration" value={sample.contactDuration} onChange={handleChange}>
                                        <option value="A - Limited (<24h)">A - Limited ( LT 24h)</option>
                                        <option value="B - Prolonged (24h-30d)">B - Prolonged (24h-30d)</option>
                                        <option value="C - Permanent (>30d)">C - Permanent ( GT 30d)</option>
                                    </select>
                                </div>

                                <div className={styles.info} style={{ width: '20%' }}>
                                    <div className={styles.infoDetail}>Manufacturer's Name</div>
                                    <input name="manufacturer" value={sample.manufacturer} onChange={handleChange} />
                                </div>
                                <div className={styles.info} style={{ width: '20%' }}>
                                    <div className={styles.infoDetail}>Date of Manufacture</div>
                                    <input name="manufactureDate" value={sample.manufactureDate} onChange={handleChange} />
                                </div>
                                <div className={styles.info} style={{ width: '20%' }}>
                                    <div className={styles.infoDetail}>Expiration Date</div>
                                    <input name="expirationDate" value={sample.expirationDate} onChange={handleChange} />
                                </div>

                            </div>
                            <div className={styles.details}>
                                <div className={styles.info} style={{ width: '20%' }}>
                                    <div className={styles.infoDetail}>Wall Thickness</div>
                                    <select className={styles.dropdown} name="wallThickness" value={sample.wallThickness} onChange={handleChange}>
                                        <option value=">1.0 mm">GT 1.0 mm</option>
                                        <option value="<1.0 mm">LT 1.0 mm</option>
                                    </select>
                                </div>
                                <div className={styles.info} style={{ width: '20%' }}>
                                    <div className={styles.infoDetail}>Extraction Ratios</div>
                                    <select className={styles.dropdown} name="extractionRatios" value={sample.extractionRatios} onChange={handleChange}>
                                        <option value="3 cm2/ml">3 cm2/ml</option>
                                        <option value="6 cm2/ml">6 cm2/ml</option>
                                    </select>
                                </div>
                                <div className={styles.info} style={{ width: '20%' }}>
                                    <div className={styles.infoDetail}>Desired Markets</div>
                                    <input name="desiredMarkets" value={sample.desiredMarkets} onChange={handleChange} />
                                </div>
                                <div className={styles.info} style={{ width: '20%' }}>
                                    <div className={styles.infoDetail}>Sample Sterile</div>
                                    <select className={styles.dropdown} name="sampleSterile" value={sample.sampleSterile} onChange={handleChange}>
                                        <option value="Sterile">Sterile</option>
                                        <option value="Non-Sterile">Non-Sterile</option>
                                    </select>
                                </div>
                                <div className={styles.info} style={{ width: '20%' }}>
                                    <div className={styles.infoDetail}>Sterilization Method</div>
                                    <select className={styles.dropdown} name="sterilizationMethod" value={sample.sterilizationMethod} onChange={handleChange}>
                                        <option value="Radiation">Radiation</option>
                                        <option value="EtO">EtO</option>
                                        <option value="Steam">Steam</option>
                                    </select>
                                </div>
                            </div>

                            <div className={styles.details2}>
                                <div className={styles.info2} style={{ width: '100%' }}>
                                    <div className={styles.infoDetail}>Appearance w/ Color</div>
                                    <input name="appearance" value={sample.appearance} onChange={handleChange} />
                                </div>
                            </div>

                            <div className={styles.details}>
                                <div className={styles.info}>
                                    <div className={styles.infoDetail}>Device Type</div>
                                    <div style={{ display: 'flex', gap: '20px', marginTop: '10px' }}>
                                        <label>
                                            <input
                                                type="radio"
                                                name="deviceType"
                                                value="Device"
                                                checked={sample.deviceType === 'Device'}
                                                onChange={handleChange}
                                            /> Device
                                        </label>
                                        <label>
                                            <input
                                                type="radio"
                                                name="deviceType"
                                                value="Solid"
                                                checked={sample.deviceType === 'Solid'}
                                                onChange={handleChange}
                                            /> Solid
                                        </label>
                                        <label>
                                            <input
                                                type="radio"
                                                name="deviceType"
                                                value="Liquid"
                                                checked={sample.deviceType === 'Liquid'}
                                                onChange={handleChange}
                                            /> Liquid
                                        </label>
                                        <label>
                                            <input
                                                type="radio"
                                                name="deviceType"
                                                value="Gel"
                                                checked={sample.deviceType === 'Gel'}
                                                onChange={handleChange}
                                            /> Gel
                                        </label>
                                    </div>
                                </div>
                            </div>
                            <div className={styles.details2}>
                                <div className={styles.info2} style={{ width: '100%' }}>
                                    <div className={styles.infoDetail}>Materials of Construction, Additives, Colorants, etc.</div>
                                    <textarea
                                        name="materialsOfConstruction"
                                        value={sample.materialsOfConstruction}
                                        onChange={handleChange}
                                        className={styles.autoGrowInput}
                                        rows={1}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </WhiteIsland>

                {/* ============================================================
                    Customs / Export Classification
                    ------------------------------------------------------------
                    Captures the U.S. Schedule B (10-digit HS) code that
                    eventually goes on the commercial invoice and is sent
                    to Shippo as `tariff_number` on the customs item for
                    any international shipment containing this sample.

                    Picking the right code is the exporter's legal
                    responsibility (Foreign Trade Regulations 30.6).
                    Reference: https://www.census.gov/foreign-trade/schedules/b/
                ============================================================ */}
                <WhiteIsland className={styles.bigIsland}>
                    <h3>Customs / Export Classification</h3>
                    <p style={{ margin: '4px 0 14px', fontSize: 13, color: '#6b7280' }}>
                        Used for international shipments only. The code travels with the sample,
                        so once it&apos;s set here the shipping log will populate the customs declaration
                        automatically.
                    </p>
                    <div className={styles.main}>
                        <div className={styles.detailContainer}>
                            <div className={styles.details2}>
                                <div className={styles.info2} style={{ width: '100%' }}>
                                    <div className={styles.infoDetail}>Customs Description (what will appear on the commercial invoice)</div>
                                    <input
                                        name="tariffDescription"
                                        value={sample.tariffDescription || ''}
                                        onChange={(e) => setSample(prev => ({ ...prev, tariffDescription: e.target.value }))}
                                        placeholder="e.g. Biocompatibility test specimens, plastic"
                                    />
                                </div>
                            </div>

                            <div className={styles.details2}>
                                <div className={styles.info2} style={{ width: '100%' }}>
                                    <div className={styles.infoDetail}>Schedule B / HS Tariff Code</div>
                                    <TariffCodePicker
                                        value={sample.tariffCode || ''}
                                        description={sample.tariffDescription || ''}
                                        onChange={({ code, description, descriptionLong }) => {
                                            setSample(prev => ({
                                                ...prev,
                                                tariffCode: code || '',
                                                // Only overwrite the human description when the user
                                                // hasn't typed their own yet, or when clearing.
                                                tariffDescription: !code
                                                    ? ''
                                                    : (prev.tariffDescription && prev.tariffDescription.trim() !== ''
                                                        ? prev.tariffDescription
                                                        : (description || descriptionLong || '')),
                                            }));
                                        }}
                                    />
                                    <div style={{ fontSize: 11, color: '#6b7280', marginTop: 6 }}>
                                        Need help finding a code? Open the official Schedule B Search:&nbsp;
                                        <a
                                            href="https://uscensus.prod.3ceonline.com/"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{ color: '#2563eb' }}
                                        >
                                            Census Schedule B Search Tool
                                        </a>
                                    </div>
                                </div>
                            </div>

                            <div className={styles.details}>
                                <div className={styles.info} style={{ width: '50%' }}>
                                    <div className={styles.infoDetail}>Declared Value per Unit (USD)</div>
                                    <input
                                        name="customsValue"
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={sample.customsValue || ''}
                                        onChange={handleChange}
                                        placeholder="e.g. 25.00"
                                    />
                                </div>
                                <div className={styles.info} style={{ width: '50%' }}>
                                    <div className={styles.infoDetail}>Country of Origin (ISO-2)</div>
                                    <input
                                        name="countryOrigin"
                                        value={sample.countryOrigin || ''}
                                        onChange={handleChange}
                                        maxLength={2}
                                        placeholder="US"
                                        style={{ textTransform: 'uppercase' }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </WhiteIsland>

                {/* Sample Conditions WhiteIsland */}
                <WhiteIsland className={styles.bigIsland}>
                    <h3>Sample Conditions</h3>
                    <div className={styles.main}>
                        <div className={styles.detailContainer}>
                            <div className={`${styles.details} ${styles.conditionsTable}`}>
                                <div className={`${styles.info} ${styles.conditionColumn}`}>
                                    <div className={styles.columnHeader}>Shipping Condition</div>
                                    <div className={styles.radioGroup}>
                                        <label>
                                            <input
                                                type="radio"
                                                name="shippingCondition"
                                                value="Ambient"
                                                checked={sample.shippingCondition === 'Ambient'}
                                                onChange={handleChange}
                                            /> Ambient
                                        </label>
                                        <label>
                                            <input
                                                type="radio"
                                                name="shippingCondition"
                                                value="On Ice"
                                                checked={sample.shippingCondition === 'On Ice'}
                                                onChange={handleChange}
                                            /> On Ice
                                        </label>
                                        <label>
                                            <input
                                                type="radio"
                                                name="shippingCondition"
                                                value="On Dry Ice"
                                                checked={sample.shippingCondition === 'On Dry Ice'}
                                                onChange={handleChange}
                                            /> On Dry Ice
                                        </label>
                                    </div>
                                </div>

                                <div className={`${styles.info} ${styles.conditionColumn}`}>
                                    <div className={styles.columnHeader}>Sample Storage Condition</div>
                                    <div className={styles.radioGroup}>
                                        <label>
                                            <input
                                                type="radio"
                                                name="sampleStorage"
                                                value="Room Temperature"
                                                checked={sample.sampleStorage === 'Room Temperature'}
                                                onChange={handleChange}
                                            /> Room Temperature
                                        </label>
                                        <label>
                                            <input
                                                type="radio"
                                                name="sampleStorage"
                                                value="Refrigerated"
                                                checked={sample.sampleStorage === 'Refrigerated'}
                                                onChange={handleChange}
                                            /> Refrigerated
                                        </label>
                                        <label>
                                            <input
                                                type="radio"
                                                name="sampleStorage"
                                                value="Freezer -10°C to -25°C"
                                                checked={sample.sampleStorage === 'Freezer -10°C to -25°C'}
                                                onChange={handleChange}
                                            /> Freezer -10°C to -25°C
                                        </label>
                                        <label>
                                            <input
                                                type="radio"
                                                name="sampleStorage"
                                                value="Freezer ≤ -70°C"
                                                checked={sample.sampleStorage === 'Freezer ≤ -70°C'}
                                                onChange={handleChange}
                                            /> Freezer ≤ -70°C
                                        </label>
                                    </div>
                                </div>

                                <div className={`${styles.info} ${styles.conditionColumn}`}>
                                    <div className={styles.columnHeader}>Sample Disposition</div>
                                    <div className={styles.radioGroup}>
                                        <label>
                                            <input
                                                type="radio"
                                                name="sampleDisposition"
                                                value="Discard"
                                                checked={sample.sampleDisposition === 'Discard'}
                                                onChange={handleChange}
                                            /> Discard
                                        </label>
                                        <label>
                                            <input
                                                type="radio"
                                                name="sampleDisposition"
                                                value="Return Unused Samples"
                                                checked={sample.sampleDisposition === 'Return Unused Samples'}
                                                onChange={handleChange}
                                            /> Return Unused Samples
                                        </label>
                                        <label>
                                            <input
                                                type="radio"
                                                name="sampleDisposition"
                                                value="Return All Samples"
                                                checked={sample.sampleDisposition === 'Return All Samples'}
                                                onChange={handleChange}
                                            /> Return All Samples
                                        </label>
                                    </div>
                                </div>
                            </div>

                            <div className={styles.details2}>
                                <div className={styles.info2} style={{ width: '100%' }}>
                                    <div className={styles.infoDetail}>Safety Precautions</div>
                                    <textarea
                                        name="safetyPrecautions"
                                        value={sample.safetyPrecautions}
                                        onChange={handleChange}
                                        className={styles.autoGrowInput}
                                        rows={1}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </WhiteIsland>

                {/* ============================================================
                    Extended Sample Details
                    ------------------------------------------------------------
                    Fields mined from the sponsor TRF / TIDS / PCF templates
                    in G:\Projects\Tulip-main\Files. All optional; they only
                    apply when the customer's template asks for them. Saved
                    on the Sample schema as first-class columns.
                ============================================================ */}
                <WhiteIsland className={styles.bigIsland}>
                    <h3>Extended Sample Details</h3>
                    <div className={styles.main}>
                        <div className={styles.detailContainer}>
                            {/* Compliance & study */}
                            <div className={styles.details}>
                                <div className={styles.info} style={{ width: '25%' }}>
                                    <div className={styles.infoDetail}>Study Compliance</div>
                                    <select className={styles.dropdown} name="studyCompliance" value={sample.studyCompliance || ''} onChange={handleChange}>
                                        <option value="">—</option>
                                        <option value="GLP">GLP</option>
                                        <option value="Non-GLP">Non-GLP</option>
                                        <option value="NABL (ISO 17025)">NABL (ISO 17025)</option>
                                        <option value="ASCA (A2LA)">ASCA (A2LA)</option>
                                        <option value="Non-NABL">Non-NABL</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                                <div className={styles.info} style={{ width: '25%' }}>
                                    <div className={styles.infoDetail}>Product Type</div>
                                    <select className={styles.dropdown} name="productType" value={sample.productType || ''} onChange={handleChange}>
                                        <option value="">—</option>
                                        <option value="Medical Device">Medical Device</option>
                                        <option value="Herbal Formulation">Herbal Formulation</option>
                                        <option value="Active Pharmaceutical Ingredient">API</option>
                                        <option value="Pharmaceutical Formulation">Pharmaceutical Formulation</option>
                                        <option value="Agrochemical">Agrochemical</option>
                                        <option value="Industrial Chemical">Industrial Chemical</option>
                                        <option value="Food Additives">Food Additives</option>
                                        <option value="Packaging Material">Packaging Material</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                                <div className={styles.info} style={{ width: '25%' }}>
                                    <div className={styles.infoDetail}>Method of Manufacturing</div>
                                    <select className={styles.dropdown} name="methodOfManufacturing" value={sample.methodOfManufacturing || ''} onChange={handleChange}>
                                        <option value="">—</option>
                                        <option value="Injection Molded">Injection Molded</option>
                                        <option value="Formulated">Formulated</option>
                                        <option value="3D Printed">3D Printed</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                                <div className={styles.info} style={{ width: '25%' }}>
                                    <div className={styles.infoDetail}>Body Contact Nature</div>
                                    <select className={styles.dropdown} name="bodyContactNature" value={sample.bodyContactNature || ''} onChange={handleChange}>
                                        <option value="">—</option>
                                        <option value="Intact skin">Intact skin</option>
                                        <option value="Intact mucosal membrane">Intact mucosal membrane</option>
                                        <option value="Breached / compromised surfaces">Breached / compromised surfaces</option>
                                        <option value="Circulating blood">Circulating blood</option>
                                    </select>
                                </div>
                            </div>

                            {/* Identifiers */}
                            <div className={styles.details}>
                                <div className={styles.info} style={{ width: '25%' }}>
                                    <div className={styles.infoDetail}>Batch Number</div>
                                    <input name="batchNumber" value={sample.batchNumber || ''} onChange={handleChange} />
                                </div>
                                <div className={styles.info} style={{ width: '25%' }}>
                                    <div className={styles.infoDetail}>Serial Number</div>
                                    <input name="serialNumber" value={sample.serialNumber || ''} onChange={handleChange} />
                                </div>
                                <div className={styles.info} style={{ width: '25%' }}>
                                    <div className={styles.infoDetail}>Total Quantity Supplied</div>
                                    <input name="totalQuantitySupplied" value={sample.totalQuantitySupplied || ''} onChange={handleChange} placeholder="e.g. 5 units" />
                                </div>
                                <div className={styles.info} style={{ width: '25%' }}>
                                    <div className={styles.infoDetail}>No. of Samples Shipped</div>
                                    <input name="numberOfSamplesShipped" value={sample.numberOfSamplesShipped || ''} onChange={handleChange} />
                                </div>
                            </div>

                            {/* Chemistry */}
                            <div className={styles.details}>
                                <div className={styles.info} style={{ width: '25%' }}>
                                    <div className={styles.infoDetail}>CAS Number</div>
                                    <input name="casNumber" value={sample.casNumber || ''} onChange={handleChange} />
                                </div>
                                <div className={styles.info} style={{ width: '25%' }}>
                                    <div className={styles.infoDetail}>Chemical Name (IUPAC)</div>
                                    <input name="chemicalName" value={sample.chemicalName || ''} onChange={handleChange} />
                                </div>
                                <div className={styles.info} style={{ width: '25%' }}>
                                    <div className={styles.infoDetail}>Molecular Formula</div>
                                    <input name="molecularFormula" value={sample.molecularFormula || ''} onChange={handleChange} />
                                </div>
                                <div className={styles.info} style={{ width: '25%' }}>
                                    <div className={styles.infoDetail}>Molecular Weight</div>
                                    <input name="molecularWeight" value={sample.molecularWeight || ''} onChange={handleChange} />
                                </div>
                            </div>

                            <div className={styles.details}>
                                <div className={styles.info} style={{ width: '25%' }}>
                                    <div className={styles.infoDetail}>Colour</div>
                                    <input name="productColor" value={sample.productColor || ''} onChange={handleChange} />
                                </div>
                                <div className={styles.info} style={{ width: '25%' }}>
                                    <div className={styles.infoDetail}>pH</div>
                                    <input name="pH" value={sample.pH || ''} onChange={handleChange} />
                                </div>
                                <div className={styles.info} style={{ width: '25%' }}>
                                    <div className={styles.infoDetail}>Purity / Concentration</div>
                                    <input name="purityConcentration" value={sample.purityConcentration || ''} onChange={handleChange} />
                                </div>
                                <div className={styles.info} style={{ width: '25%' }}>
                                    <div className={styles.infoDetail}>Density</div>
                                    <input name="density" value={sample.density || ''} onChange={handleChange} />
                                </div>
                            </div>

                            <div className={styles.details2}>
                                <div className={styles.info2} style={{ width: '100%' }}>
                                    <div className={styles.infoDetail}>Solubility</div>
                                    <input name="solubility" value={sample.solubility || ''} onChange={handleChange} />
                                </div>
                            </div>

                            <div className={styles.details2}>
                                <div className={styles.info2} style={{ width: '100%' }}>
                                    <div className={styles.infoDetail}>Composition (materials, additives, colorants)</div>
                                    <textarea
                                        name="composition"
                                        value={sample.composition || ''}
                                        onChange={handleChange}
                                        className={styles.autoGrowInput}
                                        rows={1}
                                    />
                                </div>
                            </div>

                            {/* Sterilization */}
                            <div className={styles.details}>
                                <div className={styles.info} style={{ width: '33%' }}>
                                    <div className={styles.infoDetail}>Sterilization Date</div>
                                    <input name="sterilizationDate" value={sample.sterilizationDate || ''} onChange={handleChange} />
                                </div>
                                <div className={styles.info} style={{ width: '33%' }}>
                                    <div className={styles.infoDetail}>Sterilized By</div>
                                    <input name="sterilizedBy" value={sample.sterilizedBy || ''} onChange={handleChange} />
                                </div>
                                <div className={styles.info} style={{ width: '33%' }}>
                                    <div className={styles.infoDetail}>Sample Stability</div>
                                    <input name="sampleStability" value={sample.sampleStability || ''} onChange={handleChange} />
                                </div>
                            </div>

                            {/* Extraction details */}
                            <div className={styles.details}>
                                <div className={styles.info} style={{ width: '33%' }}>
                                    <div className={styles.infoDetail}>Extraction Method</div>
                                    <select className={styles.dropdown} name="extractionMethod" value={sample.extractionMethod || ''} onChange={handleChange}>
                                        <option value="">—</option>
                                        <option value="All Parts Included">All Parts Included</option>
                                        <option value="Internal Filled then Submerged">Internal Filled then Submerged</option>
                                        <option value="Internal Only - Filled">Internal Only - Filled</option>
                                        <option value="External Only - Submerged">External Only - Submerged</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                                <div className={styles.info} style={{ width: '33%' }}>
                                    <div className={styles.infoDetail}>Extraction Temperature</div>
                                    <select className={styles.dropdown} name="extractionTemperature" value={sample.extractionTemperature || ''} onChange={handleChange}>
                                        <option value="">—</option>
                                        <option value="37°C">37 °C</option>
                                        <option value="50°C">50 °C</option>
                                        <option value="70°C">70 °C</option>
                                        <option value="121°C">121 °C</option>
                                    </select>
                                </div>
                                <div className={styles.info} style={{ width: '33%' }}>
                                    <div className={styles.infoDetail}>Samples Pooled?</div>
                                    <select className={styles.dropdown} name="samplesPooled" value={sample.samplesPooled || ''} onChange={handleChange}>
                                        <option value="">—</option>
                                        <option value="Yes">Yes</option>
                                        <option value="No">No</option>
                                        <option value="N/A">N/A</option>
                                    </select>
                                </div>
                            </div>

                            <div className={styles.details}>
                                <div className={styles.info} style={{ width: '50%' }}>
                                    <div className={styles.infoDetail}>Polar Extraction Vehicle</div>
                                    <select className={styles.dropdown} name="polarVehicle" value={sample.polarVehicle || ''} onChange={handleChange}>
                                        <option value="">—</option>
                                        <option value="Physiological Saline">Physiological Saline</option>
                                        <option value="Distilled Water">Distilled Water</option>
                                        <option value="USP 88 Vehicle">USP 88 Vehicle</option>
                                        <option value="Other">Other</option>
                                        <option value="N/A">N/A</option>
                                    </select>
                                </div>
                                <div className={styles.info} style={{ width: '50%' }}>
                                    <div className={styles.infoDetail}>Non-Polar Extraction Vehicle</div>
                                    <select className={styles.dropdown} name="nonPolarVehicle" value={sample.nonPolarVehicle || ''} onChange={handleChange}>
                                        <option value="">—</option>
                                        <option value="Cottonseed Oil">Cottonseed Oil</option>
                                        <option value="Sesame Oil">Sesame Oil</option>
                                        <option value="USP 88 Vehicle">USP 88 Vehicle</option>
                                        <option value="Other">Other</option>
                                        <option value="N/A">N/A</option>
                                    </select>
                                </div>
                            </div>

                            <div className={styles.details}>
                                <div className={styles.info} style={{ width: '33%' }}>
                                    <div className={styles.infoDetail}>Can be cut before extraction?</div>
                                    <select className={styles.dropdown} name="canBeCut" value={sample.canBeCut || ''} onChange={handleChange}>
                                        <option value="">—</option>
                                        <option value="Yes">Yes</option>
                                        <option value="No">No</option>
                                        <option value="N/A">N/A</option>
                                    </select>
                                </div>
                                <div className={styles.info} style={{ width: '33%' }}>
                                    <div className={styles.infoDetail}>Biohazard?</div>
                                    <select className={styles.dropdown} name="biohazard" value={sample.biohazard || ''} onChange={handleChange}>
                                        <option value="">—</option>
                                        <option value="Yes">Yes</option>
                                        <option value="No">No</option>
                                    </select>
                                </div>
                                <div className={styles.info} style={{ width: '33%' }}>
                                    <div className={styles.infoDetail}>Product Stable?</div>
                                    <select className={styles.dropdown} name="productStable" value={sample.productStable || ''} onChange={handleChange}>
                                        <option value="">—</option>
                                        <option value="Yes">Yes</option>
                                        <option value="No">No</option>
                                    </select>
                                </div>
                            </div>

                            {/* Hemocompatibility detail — direct vs indirect blood contact */}
                            <div className={styles.details}>
                                <div className={styles.info} style={{ width: '33%' }}>
                                    <div className={styles.infoDetail}>Surface Area · Direct Blood Contact</div>
                                    <input name="surfaceAreaDirect" value={sample.surfaceAreaDirect || ''} onChange={handleChange} />
                                </div>
                                <div className={styles.info} style={{ width: '33%' }}>
                                    <div className={styles.infoDetail}>Surface Area · Indirect Blood Contact</div>
                                    <input name="surfaceAreaIndirect" value={sample.surfaceAreaIndirect || ''} onChange={handleChange} />
                                </div>
                                <div className={styles.info} style={{ width: '33%' }}>
                                    <div className={styles.infoDetail}>Net Weight · Total</div>
                                    <input name="netWeightTotal" value={sample.netWeightTotal || ''} onChange={handleChange} />
                                </div>
                            </div>
                            <div className={styles.details}>
                                <div className={styles.info} style={{ width: '50%' }}>
                                    <div className={styles.infoDetail}>Net Weight · Direct Blood Contact</div>
                                    <input name="netWeightDirect" value={sample.netWeightDirect || ''} onChange={handleChange} />
                                </div>
                                <div className={styles.info} style={{ width: '50%' }}>
                                    <div className={styles.infoDetail}>Net Weight · Indirect Blood Contact</div>
                                    <input name="netWeightIndirect" value={sample.netWeightIndirect || ''} onChange={handleChange} />
                                </div>
                            </div>

                            {/* Sponsor declarations */}
                            <div className={styles.details}>
                                <div className={styles.info} style={{ width: '20%' }}>
                                    <div className={styles.infoDetail}>MSDS Attached?</div>
                                    <select className={styles.dropdown} name="msdsAttached" value={sample.msdsAttached || ''} onChange={handleChange}>
                                        <option value="">—</option><option value="Yes">Yes</option><option value="No">No</option>
                                    </select>
                                </div>
                                <div className={styles.info} style={{ width: '20%' }}>
                                    <div className={styles.infoDetail}>COA Attached?</div>
                                    <select className={styles.dropdown} name="coaAttached" value={sample.coaAttached || ''} onChange={handleChange}>
                                        <option value="">—</option><option value="Yes">Yes</option><option value="No">No</option>
                                    </select>
                                </div>
                                <div className={styles.info} style={{ width: '20%' }}>
                                    <div className={styles.infoDetail}>CAD Drawings?</div>
                                    <select className={styles.dropdown} name="cadDrawingsAttached" value={sample.cadDrawingsAttached || ''} onChange={handleChange}>
                                        <option value="">—</option><option value="Yes">Yes</option><option value="No">No</option>
                                    </select>
                                </div>
                                <div className={styles.info} style={{ width: '20%' }}>
                                    <div className={styles.infoDetail}>Absorption Check?</div>
                                    <select className={styles.dropdown} name="absorptionCheck" value={sample.absorptionCheck || ''} onChange={handleChange}>
                                        <option value="">—</option><option value="Yes">Yes</option><option value="No">No</option>
                                    </select>
                                </div>
                                <div className={styles.info} style={{ width: '20%' }}>
                                    <div className={styles.infoDetail}>Dose Formulation Analysis?</div>
                                    <select className={styles.dropdown} name="doseFormulationAnalysisRequired" value={sample.doseFormulationAnalysisRequired || ''} onChange={handleChange}>
                                        <option value="">—</option><option value="Yes">Yes</option><option value="No">No</option>
                                    </select>
                                </div>
                            </div>

                            <div className={styles.details}>
                                <div className={styles.info} style={{ width: '100%' }}>
                                    <div className={styles.infoDetail}>Predicate Device</div>
                                    <select className={styles.dropdown} name="predicateDevice" value={sample.predicateDevice || ''} onChange={handleChange}>
                                        <option value="">—</option>
                                        <option value="Supplied by Sponsor">Supplied by Sponsor</option>
                                        <option value="Procured by Test facility">Procured by Test facility</option>
                                        <option value="N/A">N/A</option>
                                    </select>
                                </div>
                            </div>

                            {/* Regulatory classifications */}
                            <div className={styles.details}>
                                <div className={styles.info} style={{ width: '25%' }}>
                                    <div className={styles.infoDetail}>EU MDR Class</div>
                                    <select className={styles.dropdown} name="mdrClassification" value={sample.mdrClassification || ''} onChange={handleChange}>
                                        <option value="">—</option><option value="I">I</option><option value="IIa">IIa</option><option value="IIb">IIb</option><option value="III">III</option>
                                    </select>
                                </div>
                                <div className={styles.info} style={{ width: '25%' }}>
                                    <div className={styles.infoDetail}>EU MDR Rule</div>
                                    <input name="mdrRule" value={sample.mdrRule || ''} onChange={handleChange} placeholder="1-22" />
                                </div>
                                <div className={styles.info} style={{ width: '25%' }}>
                                    <div className={styles.infoDetail}>Indian MDR Class</div>
                                    <select className={styles.dropdown} name="indianMdrClass" value={sample.indianMdrClass || ''} onChange={handleChange}>
                                        <option value="">—</option><option value="A">A</option><option value="B">B</option><option value="C">C</option><option value="D">D</option>
                                    </select>
                                </div>
                                <div className={styles.info} style={{ width: '25%' }}>
                                    <div className={styles.infoDetail}>US FDA Class</div>
                                    <select className={styles.dropdown} name="fdaClassification" value={sample.fdaClassification || ''} onChange={handleChange}>
                                        <option value="">—</option><option value="I">I</option><option value="II">II</option><option value="III">III</option>
                                    </select>
                                </div>
                            </div>

                            {/* Logistics */}
                            <div className={styles.details}>
                                <div className={styles.info} style={{ width: '33%' }}>
                                    <div className={styles.infoDetail}>Test Item Supplied By</div>
                                    <input name="supplierName" value={sample.supplierName || ''} onChange={handleChange} />
                                </div>
                                <div className={styles.info} style={{ width: '33%' }}>
                                    <div className={styles.infoDetail}>Packaging Details</div>
                                    <input name="packagingDetails" value={sample.packagingDetails || ''} onChange={handleChange} />
                                </div>
                                <div className={styles.info} style={{ width: '33%' }}>
                                    <div className={styles.infoDetail}>VAT Number</div>
                                    <input name="vatNumber" value={sample.vatNumber || ''} onChange={handleChange} />
                                </div>
                            </div>

                            <div className={styles.details2}>
                                <div className={styles.info2} style={{ width: '100%' }}>
                                    <div className={styles.infoDetail}>Test Item Transportation Details</div>
                                    <input name="transportationDetails" value={sample.transportationDetails || ''} onChange={handleChange} />
                                </div>
                            </div>
                            <div className={styles.details2}>
                                <div className={styles.info2} style={{ width: '100%' }}>
                                    <div className={styles.infoDetail}>Test Item Handling Requirement</div>
                                    <input name="handlingRequirements" value={sample.handlingRequirements || ''} onChange={handleChange} />
                                </div>
                            </div>
                            <div className={styles.details2}>
                                <div className={styles.info2} style={{ width: '100%' }}>
                                    <div className={styles.infoDetail}>Test Article Name for Report(s)</div>
                                    <input name="testArticleNameForReport" value={sample.testArticleNameForReport || ''} onChange={handleChange} />
                                </div>
                            </div>
                            <div className={styles.details2}>
                                <div className={styles.info2} style={{ width: '100%' }}>
                                    <div className={styles.infoDetail}>Mailing List (comma-separated emails)</div>
                                    <input name="mailingList" value={sample.mailingList || ''} onChange={handleChange} />
                                </div>
                            </div>
                            <div className={styles.details2}>
                                <div className={styles.info2} style={{ width: '100%' }}>
                                    <div className={styles.infoDetail}>Control Article Notes</div>
                                    <textarea name="controlArticle" value={sample.controlArticle || ''} onChange={handleChange} className={styles.autoGrowInput} rows={1} />
                                </div>
                            </div>
                            <div className={styles.details2}>
                                <div className={styles.info2} style={{ width: '100%' }}>
                                    <div className={styles.infoDetail}>Special Instructions</div>
                                    <textarea name="specialInstructions" value={sample.specialInstructions || ''} onChange={handleChange} className={styles.autoGrowInput} rows={1} />
                                </div>
                            </div>
                            <div className={styles.details2}>
                                <div className={styles.info2} style={{ width: '100%' }}>
                                    <div className={styles.infoDetail}>Moistening Solvent Permitted</div>
                                    <input name="solventForMoistening" value={sample.solventForMoistening || ''} onChange={handleChange} placeholder="Yes / No + notes" />
                                </div>
                            </div>
                            <div className={styles.details}>
                                <div className={styles.info} style={{ width: '50%' }}>
                                    <div className={styles.infoDetail}>Sponsor Representative</div>
                                    <input name="sponsorRepresentative" value={sample.sponsorRepresentative || ''} onChange={handleChange} />
                                </div>
                                <div className={styles.info} style={{ width: '50%' }}>
                                    <div className={styles.infoDetail}>Sponsor Signature & Date</div>
                                    <input name="sponsorSignatureDate" value={sample.sponsorSignatureDate || ''} onChange={handleChange} />
                                </div>
                            </div>
                        </div>
                    </div>
                </WhiteIsland>

                {/* ============================================================
                    Custom Fields (with BP-document suggestions)
                    ------------------------------------------------------------
                    Dynamic key/value fields the user adopted from the linked
                    Business Partner's uploaded sample documents (or added
                    manually). The list of suggestions is the union of labels
                    detected across the BP's documents that did NOT match a
                    built-in Sample Submission schema field.
                ============================================================ */}
                <WhiteIsland className={styles.bigIsland}>
                    <h3>Custom Fields</h3>
                    <div className={styles.main}>
                        <div className={styles.detailContainer}>
                            {sample.bPartnerID && (
                                <div style={{
                                    background: '#fffbeb',
                                    border: '1px solid #fde68a',
                                    borderRadius: 10,
                                    padding: 12,
                                    marginBottom: 14,
                                    fontSize: 13,
                                }}>
                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        marginBottom: showBpCandidates ? 10 : 0,
                                    }}>
                                        <div>
                                            <strong>Detected from BP documents:</strong>{' '}
                                            {bpCandidatesLoading ? 'scanning…' : `${bpCandidates.length} candidate field${bpCandidates.length === 1 ? '' : 's'}`}
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setShowBpCandidates((v) => !v)}
                                            style={{
                                                background: 'white',
                                                border: '1px solid #d1d5db',
                                                borderRadius: 6,
                                                padding: '4px 10px',
                                                fontSize: 12,
                                                cursor: 'pointer',
                                            }}
                                        >
                                            {showBpCandidates ? 'Hide' : 'Show'}
                                        </button>
                                    </div>
                                    {showBpCandidates && bpCandidates.length > 0 && (
                                        <div style={{
                                            display: 'flex',
                                            flexWrap: 'wrap',
                                            gap: 6,
                                        }}>
                                            {bpCandidates.map((c) => {
                                                const alreadyAdded = (sample.customFields || []).some((f) => f.key === c.key);
                                                return (
                                                    <button
                                                        key={c.key}
                                                        type="button"
                                                        onClick={() => handleAddCustomField({
                                                            key: c.key,
                                                            label: c.label,
                                                            value: c.sampleValue,
                                                            sourceDocumentId: c.sourceDocumentId,
                                                            sourceBPartnerId: c.sourceBPartnerId,
                                                        })}
                                                        disabled={alreadyAdded}
                                                        title={c.sourceFilename ? `From: ${c.sourceFilename}` : ''}
                                                        style={{
                                                            background: alreadyAdded ? '#e5e7eb' : 'white',
                                                            color: alreadyAdded ? '#6b7280' : '#1e40af',
                                                            border: '1px solid #cbd5e1',
                                                            borderRadius: 14,
                                                            padding: '4px 10px',
                                                            fontSize: 12,
                                                            cursor: alreadyAdded ? 'not-allowed' : 'pointer',
                                                            fontWeight: 600,
                                                        }}
                                                    >
                                                        {alreadyAdded ? '✓ ' : '+ '}{c.label.length > 60 ? c.label.slice(0, 60) + '…' : c.label}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                    {showBpCandidates && !bpCandidatesLoading && bpCandidates.length === 0 && (
                                        <div style={{ color: '#6b7280', fontSize: 12 }}>
                                            No additional candidate fields detected.
                                            Upload more TRF / TIDS / PCF documents on the Business Partner to populate this list.
                                        </div>
                                    )}
                                </div>
                            )}

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                                <div style={{ fontSize: 13, color: '#6b7280' }}>
                                    {(sample.customFields || []).length} custom field{(sample.customFields || []).length === 1 ? '' : 's'} on this submission.
                                </div>
                                <button
                                    type="button"
                                    onClick={() => handleAddCustomField()}
                                    style={{
                                        background: 'rgb(69, 112, 182)',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: 6,
                                        padding: '6px 12px',
                                        fontSize: 12,
                                        cursor: 'pointer',
                                        fontWeight: 600,
                                    }}
                                >
                                    + Add Custom Field
                                </button>
                            </div>

                            {(sample.customFields || []).length === 0 ? (
                                <div style={{
                                    padding: 20,
                                    textAlign: 'center',
                                    color: '#9ca3af',
                                    background: '#f9fafb',
                                    border: '1px dashed #d1d5db',
                                    borderRadius: 8,
                                    fontSize: 13,
                                }}>
                                    No custom fields yet. Click an entry above or &quot;+ Add Custom Field&quot; to start.
                                </div>
                            ) : (
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                                    <thead>
                                        <tr style={{ background: '#f9fafb' }}>
                                            <th style={{ textAlign: 'left', padding: 8, borderBottom: '2px solid #e5e7eb' }}>Label</th>
                                            <th style={{ textAlign: 'left', padding: 8, borderBottom: '2px solid #e5e7eb' }}>Value</th>
                                            <th style={{ width: 60, borderBottom: '2px solid #e5e7eb' }} />
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(sample.customFields || []).map((f) => (
                                            <tr key={f.key}>
                                                <td style={{ padding: 6, borderBottom: '1px solid #f1f5f9' }}>
                                                    <input
                                                        value={f.label || ''}
                                                        onChange={(e) => handleCustomFieldChange(f.key, 'label', e.target.value)}
                                                        style={{ width: '100%', padding: '4px 8px', border: '1px solid #d1d5db', borderRadius: 4 }}
                                                    />
                                                </td>
                                                <td style={{ padding: 6, borderBottom: '1px solid #f1f5f9' }}>
                                                    <input
                                                        value={f.value || ''}
                                                        onChange={(e) => handleCustomFieldChange(f.key, 'value', e.target.value)}
                                                        style={{ width: '100%', padding: '4px 8px', border: '1px solid #d1d5db', borderRadius: 4 }}
                                                    />
                                                </td>
                                                <td style={{ padding: 6, borderBottom: '1px solid #f1f5f9', textAlign: 'right' }}>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveCustomField(f.key)}
                                                        style={{
                                                            background: 'white',
                                                            border: '1px solid #fecaca',
                                                            color: '#b91c1c',
                                                            borderRadius: 4,
                                                            padding: '4px 8px',
                                                            cursor: 'pointer',
                                                            fontSize: 11,
                                                        }}
                                                    >
                                                        Remove
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </WhiteIsland>

                {/* Sample Images WhiteIsland */}
                <WhiteIsland className={styles.bigIsland}>
                    <h3 className={styles.imageHeader}>
                        Sample Images

                    </h3>
                    <div className={styles.main}>
                        <div className={styles.detailContainer}>
                            <div className={`${styles.details} ${styles.imageContainer}`}>
                                <div className={styles.imageBox}>
                                    <div className={styles.imageFrame}>
                                        {sample.sampleImages.general ? (
                                            <img
                                                src={sample.sampleImages.general}
                                                alt="General Sample"
                                                className={styles.sampleImage}
                                                onClick={handleImageClick('general')}
                                            />
                                        ) : (
                                            <div className={styles.placeholderText}>General Image</div>
                                        )}
                                        <label className={styles.imageUploadButton}>
                                            <FaImage />
                                            <input
                                                type="file"
                                                accept="image/*"
                                                style={{ display: "none" }}
                                                onChange={(e) => handleSampleImageChange('general', e)}
                                            />
                                        </label>
                                    </div>
                                    <div className={styles.imageLabel}>General</div>
                                </div>

                                <div className={styles.imageBox}>
                                    <div className={styles.imageFrame}>
                                        {sample.sampleImages.labeling ? (
                                            <img
                                                src={sample.sampleImages.labeling}
                                                alt="Labeling"
                                                className={styles.sampleImage}
                                                onClick={handleImageClick('labeling')}
                                            />
                                        ) : (
                                            <div className={styles.placeholderText}>Labeling Image</div>
                                        )}
                                        <label className={styles.imageUploadButton}>
                                            <FaImage />
                                            <input
                                                type="file"
                                                accept="image/*"
                                                style={{ display: "none" }}
                                                onChange={(e) => handleSampleImageChange('labeling', e)}
                                            />
                                        </label>
                                    </div>
                                    <div className={styles.imageLabel}>Labeling</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </WhiteIsland>

            </div>
            {/* Requested Tests WhiteIsland */}
            <WhiteIsland className={styles.bigIsland}>
                <div className={styles.header}>
                    <h3 style={{ border: "none" }}>Requested Tests</h3>
                    <button className={styles.addButton} onClick={handleAddTest}>
                        + Add
                    </button>
                </div>
                <div className={styles.main}>
                    <div className={styles.detailContainer}>
                        <div className={styles.testsTable}>
                            <table className={styles.requestedTestsTable}>
                                <thead>
                                    <tr>
                                        <th className={styles.codeColumn}>GRK Code</th>
                                        <th className={styles.descriptionColumn}>Description</th>
                                        <th className={styles.centerColumn}>Samples Submitted</th>
                                        <th>Extraction Condition</th>
                                        <th>Quality</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {tests.length === 0 ? (
                                        <tr>
                                            <td colSpan="5" style={{ textAlign: 'center', padding: '20px' }}>
                                                No tests added. Click "+ Add" to add tests.
                                            </td>
                                        </tr>
                                    ) : (
                                        tests.map((test) => (
                                            <tr key={test.id}>
                                                <td>{test.grkCode}</td>
                                                <td>{test.description}</td>
                                                <td className={styles.centerAlign} style={{ textAlign: 'left' }}>
                                                    <input 
                                                        type="text" 
                                                        value={test.samplesSubmitted}
                                                        onChange={(e) => handleTestChange(test.id, 'samplesSubmitted', e.target.value)}
                                                        className={styles.extractionInput}
                                                        style={{ width: '60px', textAlign: 'center' }}
                                                    />
                                                </td>
                                                <td>
                                                    <div className={styles.extractionParams}>
                                                        <div>
                                                            Time (h):
                                                            <input type="text" value={test.extractionTime}
                                                                onChange={(e) => handleTestChange(test.id, 'extractionTime', e.target.value)}
                                                                className={styles.extractionInput}
                                                            />
                                                        </div>
                                                        <div>
                                                            Temp (C):
                                                            <input
                                                                type="text"
                                                                value={test.extractionTemp}
                                                                onChange={(e) => handleTestChange(test.id, 'extractionTemp', e.target.value)}
                                                                className={styles.extractionInput}
                                                            />
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>
                                                    <div className={styles.qualityOptions}>
                                                        <label>
                                                            <input
                                                                type="radio"
                                                                name={`quality_${test.id}`}
                                                                value="GLP"
                                                                checked={test.quality === 'GLP'}
                                                                onChange={() => handleTestChange(test.id, 'quality', 'GLP')}
                                                            />
                                                            GLP
                                                        </label>
                                                        <label>
                                                            <input
                                                                type="radio"
                                                                name={`quality_${test.id}`}
                                                                value="Non-GLP"
                                                                checked={test.quality === 'Non-GLP'}
                                                                onChange={() => handleTestChange(test.id, 'quality', 'Non-GLP')}
                                                            />
                                                            Non-GLP
                                                        </label>
                                                    </div>
                                                    <button 
                                                        onClick={() => handleRemoveTest(test.id)}
                                                        style={{ 
                                                            marginTop: '5px', 
                                                            padding: '2px 8px', 
                                                            fontSize: '12px',
                                                            background: '#dc2626',
                                                            color: 'white',
                                                            border: 'none',
                                                            borderRadius: '3px',
                                                            cursor: 'pointer'
                                                        }}
                                                    >
                                                        Remove
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <div className={styles.testsSummary}>
                            {/* <div className={styles.sampleCount}>
                                <span>Total Samples Submitted:</span>
                                <span className={styles.countDisplay}>{testMetadata.totalSamplesSubmitted}</span>
                                <button className={styles.generateButton}>Generate Instances</button>
                            </div> */}

                            <div className={styles.serviceLevel}>
                                <span>Level of Service:</span>
                                <div className={styles.serviceLevelOptions}>
                                    <label>
                                        <input
                                            type="radio"
                                            name="serviceLevel"
                                            value="Standard"
                                            checked={testMetadata.serviceLevel === 'Standard'}
                                            onChange={handleTestMetadataChange}
                                        />
                                        Standard
                                    </label>
                                    <label>
                                        <input
                                            type="radio"
                                            name="serviceLevel"
                                            value="Expedited"
                                            checked={testMetadata.serviceLevel === 'Expedited'}
                                            onChange={handleTestMetadataChange}
                                        />
                                        Expedited
                                    </label>
                                </div>
                            </div>
                        </div>

                        <div className={styles.notesSection}>
                            <div className={styles.infoDetail}>Notes and/or Specific Requirements:</div>
                            <textarea
                                name="notes"
                                value={testMetadata.notes}
                                onChange={handleTestMetadataChange}
                                className={styles.autoGrowInput}
                                rows={2}
                            />
                        </div>
                    </div>
                </div>
            </WhiteIsland>


            {/* Instance Inventory & Movement Tracking */}
            {isEdit && (
                <WhiteIsland className={styles.bigIsland}>
                    <h3>Instance Inventory & Movement</h3>
                    <div className={styles.main}>
                        <div className={styles.detailContainer}>
                            {loadingInventory ? (
                                <div style={{ padding: '20px', textAlign: 'center' }}>Loading inventory data...</div>
                            ) : instances.length === 0 ? (
                                <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
                                    No instances created yet. Instances are generated when samples are received via a Receiving Log.
                                </div>
                            ) : (() => {
                                const summary = getInventorySummary();
                                return (
                                    <>
                                        {/* Summary Cards */}
                                        <div className={styles.inventorySummary}>
                                            <div className={`${styles.summaryCard} ${styles.summaryTotal}`}>
                                                <div className={styles.summaryNumber}>{summary.total}</div>
                                                <div className={styles.summaryLabel}>Total Instances</div>
                                            </div>
                                            <div className={`${styles.summaryCard} ${styles.summaryReceived}`}>
                                                <div className={styles.summaryNumber}>{summary.received}</div>
                                                <div className={styles.summaryLabel}>Received</div>
                                            </div>
                                            <div className={`${styles.summaryCard} ${styles.summaryWarehouse}`}>
                                                <div className={styles.summaryNumber}>{summary.inWarehouse}</div>
                                                <div className={styles.summaryLabel}>In Warehouse</div>
                                            </div>
                                            <div className={`${styles.summaryCard} ${styles.summaryShipped}`}>
                                                <div className={styles.summaryNumber}>{summary.shipped}</div>
                                                <div className={styles.summaryLabel}>Shipped</div>
                                            </div>
                                        </div>

                                        {/* Warehouse Breakdown */}
                                        {Object.keys(summary.warehouseMap).length > 0 && (
                                            <div className={styles.warehouseBreakdown}>
                                                <div className={styles.breakdownTitle}>Warehouse Distribution</div>
                                                <div className={styles.breakdownChips}>
                                                    {Object.entries(summary.warehouseMap).map(([name, count]) => (
                                                        <div key={name} className={styles.warehouseChip}>
                                                            <span className={styles.chipName}>{name}</span>
                                                            <span className={styles.chipCount}>{count}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Instance Detail Table */}
                                        <div className={styles.inventoryTableWrap}>
                                            <table className={styles.inventoryTable}>
                                                <thead>
                                                    <tr>
                                                        <th></th>
                                                        <th>Instance Code</th>
                                                        <th>Lot #</th>
                                                        <th>Test Status</th>
                                                        <th>Location</th>
                                                        <th>Warehouse</th>
                                                        <th>Last Updated</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {instances.map((inst) => {
                                                        const latest = getLatestMovementForInstance(inst._id);
                                                        const locationType = latest?.movementType || 'Received';
                                                        const warehouseName = latest?.warehouseId?.warehouseID || inst.warehouseID?.warehouseID || '-';
                                                        const isExpanded = expandedInstance === inst._id;
                                                        const instMovements = isExpanded ? getMovementsForInstance(inst._id) : [];

                                                        return (
                                                            <React.Fragment key={inst._id}>
                                                                <tr
                                                                    className={styles.inventoryRow}
                                                                    onClick={() => setExpandedInstance(isExpanded ? null : inst._id)}
                                                                >
                                                                    <td className={styles.expandCell}>
                                                                        {isExpanded ? <FaChevronUp size={10} /> : <FaChevronDown size={10} />}
                                                                    </td>
                                                                    <td className={styles.codeCell}>{inst.instanceCode}</td>
                                                                    <td>{inst.lotNo || '-'}</td>
                                                                    <td>
                                                                        <span className={`${styles.statusPill} ${styles['status_' + (inst.status || 'Pending').toLowerCase().replace(/\s/g, '')]}`}>
                                                                            {inst.status || 'Pending'}
                                                                        </span>
                                                                    </td>
                                                                    <td>
                                                                        <span className={`${styles.locationPill} ${styles['loc_' + locationType.toLowerCase().replace(/\s/g, '')]}`}>
                                                                            {locationType}
                                                                        </span>
                                                                    </td>
                                                                    <td>{warehouseName}</td>
                                                                    <td className={styles.dateCell}>{formatMovementDate(latest?.movementDate)}</td>
                                                                </tr>
                                                                {isExpanded && (
                                                                    <tr className={styles.expandedRow}>
                                                                        <td colSpan="7">
                                                                            <div className={styles.movementTimeline}>
                                                                                <div className={styles.timelineTitle}>Movement History</div>
                                                                                {instMovements.length === 0 ? (
                                                                                    <div className={styles.noMovements}>No movements recorded</div>
                                                                                ) : (
                                                                                    <div className={styles.timelineList}>
                                                                                        {instMovements.map((mv, idx) => (
                                                                                            <div key={mv._id} className={styles.timelineItem}>
                                                                                                <div className={`${styles.timelineDot} ${styles['dot_' + mv.movementType.toLowerCase().replace(/\s/g, '')]}`} />
                                                                                                <div className={styles.timelineContent}>
                                                                                                    <div className={styles.timelineHeader}>
                                                                                                        <span className={`${styles.locationPill} ${styles['loc_' + mv.movementType.toLowerCase().replace(/\s/g, '')]}`}>
                                                                                                            {mv.movementType}
                                                                                                        </span>
                                                                                                        <span className={styles.timelineDate}>
                                                                                                            {formatMovementDate(mv.movementDate)}
                                                                                                        </span>
                                                                                                    </div>
                                                                                                    <div className={styles.timelineDetails}>
                                                                                                        {mv.warehouseId?.warehouseID && (
                                                                                                            <span>Warehouse: {mv.warehouseId.warehouseID}</span>
                                                                                                        )}
                                                                                                        {mv.receivingId?.receivingCode && (
                                                                                                            <span>Receiving: {mv.receivingId.receivingCode}</span>
                                                                                                        )}
                                                                                                        {mv.shippingId?.shippingCode && (
                                                                                                            <span>Shipping: {mv.shippingId.shippingCode}</span>
                                                                                                        )}
                                                                                                    </div>
                                                                                                    {mv.notes && (
                                                                                                        <div className={styles.timelineNotes}>{mv.notes}</div>
                                                                                                    )}
                                                                                                </div>
                                                                                            </div>
                                                                                        ))}
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        </td>
                                                                    </tr>
                                                                )}
                                                            </React.Fragment>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </>
                                );
                            })()}
                        </div>
                    </div>
                </WhiteIsland>
            )}

            {/* Submission Approval WhiteIsland */}
            {/* NOTE : data for this section is not being saved in the object-sample. The input fields just have a default value  */}
            <WhiteIsland className={`${styles.bigIsland} ${styles.approvalIsland}`}>
                <h3>Submission Approval</h3>
                <div className={styles.main}>
                    <div className={styles.detailContainer}>
                        <div className={styles.approvalSection}>
                            <div className={styles.approvalRow}>
                                <div className={styles.approvalLabel}>Groenakker Acceptance: </div>
                                <div className={styles.approvalName}>
                                    <input className={styles.mainText} defaultValue='' />
                                    <div className={styles.subText}>Name</div>
                                </div>
                                <div className={styles.approvalSignature}>
                                    <SignatureCanvas
                                        ref={sigCanvas}
                                        canvasProps={{
                                            className: styles.signatureCanvas
                                        }}
                                        backgroundColor="#f0f0f0"
                                    />
                                    <div className={styles.signatureActions}>
                                        <button type="button" onClick={clearSignature} className={styles.smallBtn}>Clear</button>
                                        <button type="button" onClick={saveSignature} className={styles.smallBtn}>Save</button>
                                    </div>
                                    <div className={styles.subText}>Signature</div>
                                </div>
                                <div className={styles.approvalDate}>
                                    <input className={styles.mainText} defaultValue='9 Jan 2025'></input>
                                    <div className={styles.subText}>Date</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </WhiteIsland>
            <div className={styles.saves}>
                {id !== 'add' && (
                    <button className={styles.deleteButton} onClick={handleDelete}><FaTrash />Delete</button>
                )}
                <button className={styles.saveButton} onClick={handleSave}><FaSave />Save</button>
            </div>




            {/* Fullscreen Image Modal */}
            {viewingImage && (
                <Modal onClose={() => setViewingImage(null)}>
                    <div className={styles.fullScreenImageContainer}>
                        <img
                            src={viewingImage.src}
                            alt={viewingImage.alt}
                            className={styles.fullScreenImage}
                        />
                    </div>
                </Modal>
            )}

            {/* Test Code Selection Modal */}
            {showTestCodeModal && (
                <Modal onClose={() => setShowTestCodeModal(false)}>
                    <TestCodeChecklist 
                        onClose={() => setShowTestCodeModal(false)}
                        onTestSelected={handleTestSelected}
                    />
                </Modal>
            )}

        </div>
    );
}