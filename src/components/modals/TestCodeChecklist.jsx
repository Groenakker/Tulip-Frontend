import { useState } from 'react';
import styles from './TestCodeChecklist.module.css';
import { FaSearch } from 'react-icons/fa';

const TestCodesChecklist = ({ onClose }) => {
  //State for tracking every test code selected( edit this to change the already added list of code from tulip DB)
  const [selectedCodes, setSelectedCodes] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Replace with your actual data later
  const testCodeOptions = [
    {
      id: 'code1',
      grkCode: 'BC-GP-VOCP',
      description: 'Gas Pathway : 48 hour VOC and Particulate Sampling',
      category: 'Physical and chemical',
      extractedBasis: 'No'
    },
    {
      id: 'code2',
      grkCode: 'BC-GP-VOCP2',
      description: 'Gas Pathway : 48 hour VOC and Particulate Sampling',
      category: 'Physical and chemical',
      extractedBasis: 'No'
    },
    {
      id: 'code3',
      grkCode: 'BC-GP-VOCP3',
      description: 'Gas Pathway : 48 hour VOC and Particulate Sampling',
      category: 'Physical and chemical',
      extractedBasis: 'No'
    },
    {
      id: 'code4',
      grkCode: 'BC-GP-VOCP4',
      description: 'Gas Pathway : 48 hour VOC and Particulate Sampling',
      category: 'Physical and chemical',
      extractedBasis: 'No'
    },
    {
      id: 'code5',
      grkCode: 'BC-GP-VOCP5',
      description: 'Gas Pathway : 48 hour VOC and Particulate Sampling',
      category: 'Physical and chemical',
      extractedBasis: 'No'
    }
  ];

  const handleCheckboxChange = (id) => {
    setSelectedCodes(prev =>
      prev.includes(id)
        ? prev.filter(code => code !== id)
        : [...prev, id]
    );
  };

  // Save to commit saved data to DB
  const handleSave = () => {
    console.log('Selected Test Codes:', selectedCodes);
    onClose(); // Close the modal after saving
  };

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
        {testCodeOptions.map(option => (
          <label
            key={option.id}
            className={`${styles.optionCard} ${selectedCodes.includes(option.id) ? styles.selected : ''}`}
          >
            <input
              type="checkbox"
              checked={selectedCodes.includes(option.id)}
              onChange={() => handleCheckboxChange(option.id)}
              className={styles.checkbox}
            />
            <div className={styles.optionContent}>
              <div className={styles.grkCode}>{option.grkCode}</div>
              <div className={styles.description}>{option.description}</div>
              <div className={styles.meta}>
                <span><strong>Category:</strong> {option.category}</span>
                <span><strong>Extracted Basis:</strong> {option.extractedBasis}</span>
              </div>
            </div>
          </label>
        ))}
      </div>

      <div className={styles.actions}>
        <button onClick={handleSave} className={styles.saveBtn}>Save</button>
        <button onClick={onClose} className={styles.cancelBtn}>Cancel</button>
      </div>
    </div>
  );
};

export default TestCodesChecklist;