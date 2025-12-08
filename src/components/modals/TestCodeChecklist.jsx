import { useState, useEffect } from 'react';
import styles from './TestCodeChecklist.module.css';
import { FaSearch } from 'react-icons/fa';
import toast from 'react-hot-toast';

const TestCodesChecklist = ({ onClose, onTestSelected }) => {
  //State for tracking every test code selected
  const [selectedCodes, setSelectedCodes] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [testCodeOptions, setTestCodeOptions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch test codes from backend
  useEffect(() => {
    const fetchTestCodes = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/testcodes`);
        if (!res.ok) throw new Error('Failed to fetch test codes');
        const data = await res.json();
        setTestCodeOptions(data);
      } catch (error) {
        console.error('Error fetching test codes:', error);
        toast.error('Failed to load test codes');
      } finally {
        setLoading(false);
      }
    };
    fetchTestCodes();
  }, []);

  const handleCheckboxChange = (id) => {
    setSelectedCodes(prev =>
      prev.includes(id)
        ? prev.filter(code => code !== id)
        : [...prev, id]
    );
  };

  // Save to commit saved data to DB
  const handleSave = () => {
    if (selectedCodes.length === 0) {
      toast.error('Please select at least one test code');
      return;
    }
    
    const selectedTests = testCodeOptions.filter(test => selectedCodes.includes(test._id));
    if (onTestSelected) {
      onTestSelected(selectedTests);
    }
    onClose(); // Close the modal after saving
  };

  // Filter test codes based on search term
  const filteredTestCodes = testCodeOptions.filter(test => {
    const searchLower = searchTerm.toLowerCase();
    return (
      (test.code || '').toLowerCase().includes(searchLower) ||
      (test.descriptionShort || '').toLowerCase().includes(searchLower) ||
      (test.descriptionLong || '').toLowerCase().includes(searchLower) ||
      (test.category || '').toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>Select Test Codes</h3>

      
      {/* SEARCHBARR  */}
      <div className={styles.searchContainer}>
        <div className={styles.searchInputWrapper}>
          <FaSearch className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Search test codes, descriptions, or categories..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
          />
        </div>
      </div>


      {/* List of test codes */}
      <div className={styles.list}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '20px' }}>Loading test codes...</div>
        ) : filteredTestCodes.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            {searchTerm ? 'No test codes found matching your search' : 'No test codes available'}
          </div>
        ) : (
          filteredTestCodes.map(option => (
            <label
              key={option._id}
              className={`${styles.optionCard} ${selectedCodes.includes(option._id) ? styles.selected : ''}`}
            >
              <input
                type="checkbox"
                checked={selectedCodes.includes(option._id)}
                onChange={() => handleCheckboxChange(option._id)}
                className={styles.checkbox}
              />
              <div className={styles.optionContent}>
                <div className={styles.grkCode}>{option.code || 'N/A'}</div>
                <div className={styles.description}>
                  {option.descriptionLong || option.descriptionShort || 'No description'}
                </div>
                <div className={styles.meta}>
                  {option.category && <span><strong>Category:</strong> {option.category}</span>}
                  {option.extractBased && <span><strong>Extract Based:</strong> {option.extractBased}</span>}
                  {option.standard && <span><strong>Standard:</strong> {option.standard}</span>}
                </div>
              </div>
            </label>
          ))
        )}
      </div>

      <div className={styles.actions}>
        <button onClick={handleSave} className={styles.saveBtn}>Save</button>
        <button onClick={onClose} className={styles.cancelBtn}>Cancel</button>
      </div>
    </div>
  );
};

export default TestCodesChecklist;