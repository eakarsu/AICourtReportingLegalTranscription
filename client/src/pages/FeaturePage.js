import React, { useState, useEffect, useCallback } from 'react';
import API from '../services/api';
import { toast } from 'react-toastify';
import './FeaturePage.css';

const STATUS_COLORS = {
  green: ['active', 'completed', 'paid', 'approved', 'done', 'success'],
  yellow: ['pending', 'in_progress', 'in progress', 'processing', 'scheduled', 'draft'],
  red: ['overdue', 'cancelled', 'canceled', 'denied', 'failed', 'rejected', 'inactive'],
};

function getStatusClass(value) {
  if (!value) return 'status-default';
  const lower = String(value).toLowerCase();
  if (STATUS_COLORS.green.includes(lower)) return 'status-active';
  if (STATUS_COLORS.yellow.includes(lower)) return 'status-pending';
  if (STATUS_COLORS.red.includes(lower)) return 'status-cancelled';
  return 'status-default';
}

function formatValue(value, key) {
  if (value === null || value === undefined) return '\u2014';

  // Date detection
  if (
    typeof value === 'string' &&
    (/^\d{4}-\d{2}-\d{2}(T|\s)/.test(value) || key.toLowerCase().includes('date'))
  ) {
    const d = new Date(value);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: value.includes('T') || value.includes(':') ? '2-digit' : undefined,
        minute: value.includes('T') || value.includes(':') ? '2-digit' : undefined,
      });
    }
  }

  // Currency / money detection
  if (
    typeof value === 'number' &&
    (key.toLowerCase().includes('amount') ||
      key.toLowerCase().includes('price') ||
      key.toLowerCase().includes('cost') ||
      key.toLowerCase().includes('fee') ||
      key.toLowerCase().includes('rate') ||
      key.toLowerCase().includes('total') ||
      key.toLowerCase().includes('balance'))
  ) {
    return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  if (typeof value === 'number') {
    return value.toLocaleString('en-US');
  }

  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }

  return String(value);
}

function isStatusField(key) {
  const lower = key.toLowerCase();
  return lower === 'status' || lower.includes('status') || lower === 'state';
}

const FeaturePage = ({ title, endpoint, columns, formFields }) => {
  const [items, setItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({});

  const buildEmptyForm = useCallback(() => {
    const empty = {};
    formFields.forEach((f) => {
      empty[f.key] = f.type === 'number' ? '' : '';
    });
    return empty;
  }, [formFields]);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = searchQuery ? { search: searchQuery } : {};
      const response = await API.get(endpoint, { params });
      const data = Array.isArray(response.data)
        ? response.data
        : response.data.results || response.data.data || [];
      setItems(data);
    } catch (err) {
      toast.error(`Failed to load ${title.toLowerCase()}: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [endpoint, searchQuery, title]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // --- Handlers ---

  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
  };

  const handleRowClick = (item) => {
    setSelectedItem(item);
  };

  const handleCloseDetail = () => {
    setSelectedItem(null);
  };

  const handleOpenCreate = () => {
    setEditingItem(null);
    setFormData(buildEmptyForm());
    setIsFormOpen(true);
  };

  const handleOpenEdit = () => {
    setEditingItem(selectedItem);
    const populated = {};
    formFields.forEach((f) => {
      populated[f.key] =
        selectedItem[f.key] !== null && selectedItem[f.key] !== undefined
          ? selectedItem[f.key]
          : '';
    });
    setFormData(populated);
    setSelectedItem(null);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingItem(null);
    setFormData({});
  };

  const handleFormChange = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingItem) {
        const id = editingItem.id || editingItem._id;
        await API.put(`${endpoint}/${id}`, formData);
        toast.success(`${title} item updated successfully`);
      } else {
        await API.post(endpoint, formData);
        toast.success(`${title} item created successfully`);
      }
      handleCloseForm();
      fetchItems();
    } catch (err) {
      const msg =
        err.response?.data?.message || err.response?.data?.error || err.message;
      toast.error(`Save failed: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedItem) return;
    const confirmed = window.confirm(
      `Are you sure you want to delete this ${title.toLowerCase()} item? This action cannot be undone.`
    );
    if (!confirmed) return;

    setLoading(true);
    try {
      const id = selectedItem.id || selectedItem._id;
      await API.delete(`${endpoint}/${id}`);
      toast.success(`${title} item deleted successfully`);
      setSelectedItem(null);
      fetchItems();
    } catch (err) {
      const msg =
        err.response?.data?.message || err.response?.data?.error || err.message;
      toast.error(`Delete failed: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  // --- Renderers ---

  const renderCellValue = (item, col) => {
    const value = item[col.key];
    if (isStatusField(col.key) && value) {
      return (
        <span className={`status-badge ${getStatusClass(value)}`}>
          {String(value).replace(/_/g, ' ')}
        </span>
      );
    }
    return formatValue(value, col.key);
  };

  const renderTable = () => (
    <div className="feature-table-wrapper">
      <table className="feature-table">
        <thead>
          <tr className="table-header">
            {columns.map((col) => (
              <th key={col.key} className="table-cell table-header-cell">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="table-cell table-empty">
                {loading ? 'Loading...' : 'No items found.'}
              </td>
            </tr>
          ) : (
            items.map((item, idx) => (
              <tr
                key={item.id || item._id || idx}
                className="table-row"
                onClick={() => handleRowClick(item)}
              >
                {columns.map((col) => (
                  <td key={col.key} className="table-cell">
                    {renderCellValue(item, col)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );

  const renderDetailModal = () => {
    if (!selectedItem) return null;
    const allKeys = Object.keys(selectedItem).filter(
      (k) => k !== '__v' && k !== 'password' && k !== 'passwordHash'
    );

    return (
      <div className="modal-overlay" onClick={handleCloseDetail}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h2>{title} Details</h2>
            <button
              className="btn-close-modal"
              onClick={handleCloseDetail}
              aria-label="Close"
            >
              &times;
            </button>
          </div>
          <div className="modal-body">
            <div className="detail-card">
              {allKeys.map((key) => (
                <div className="detail-field" key={key}>
                  <span className="detail-label">
                    {key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ')}
                  </span>
                  <span className="detail-value">
                    {isStatusField(key) && selectedItem[key] ? (
                      <span
                        className={`status-badge ${getStatusClass(selectedItem[key])}`}
                      >
                        {String(selectedItem[key]).replace(/_/g, ' ')}
                      </span>
                    ) : (
                      formatValue(selectedItem[key], key)
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn-edit btn-primary" onClick={handleOpenEdit}>
              Edit
            </button>
            <button className="btn-delete btn-danger" onClick={handleDelete}>
              Delete
            </button>
            <button className="btn-secondary" onClick={handleCloseDetail}>
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderFormModal = () => {
    if (!isFormOpen) return null;

    return (
      <div className="modal-overlay" onClick={handleCloseForm}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h2>{editingItem ? `Edit ${title}` : `Add New ${title}`}</h2>
            <button
              className="btn-close-modal"
              onClick={handleCloseForm}
              aria-label="Close"
            >
              &times;
            </button>
          </div>
          <form onSubmit={handleFormSubmit}>
            <div className="modal-body">
              {formFields.map((field) => (
                <div className="form-group" key={field.key}>
                  <label className="form-label" htmlFor={`field-${field.key}`}>
                    {field.label}
                  </label>

                  {field.type === 'select' ? (
                    <select
                      id={`field-${field.key}`}
                      className="form-select"
                      value={formData[field.key] || ''}
                      onChange={(e) => handleFormChange(field.key, e.target.value)}
                    >
                      <option value="">-- Select --</option>
                      {(field.options || []).map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  ) : field.type === 'textarea' ? (
                    <textarea
                      id={`field-${field.key}`}
                      className="form-textarea"
                      rows={4}
                      value={formData[field.key] || ''}
                      onChange={(e) => handleFormChange(field.key, e.target.value)}
                    />
                  ) : (
                    <input
                      id={`field-${field.key}`}
                      className="form-input"
                      type={field.type || 'text'}
                      value={formData[field.key] || ''}
                      onChange={(e) =>
                        handleFormChange(
                          field.key,
                          field.type === 'number'
                            ? e.target.value === '' ? '' : Number(e.target.value)
                            : e.target.value
                        )
                      }
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="modal-footer">
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Saving...' : 'Save'}
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={handleCloseForm}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  return (
    <div className="feature-page">
      <div className="feature-header">
        <h1 className="feature-title">{title}</h1>
        <div className="feature-actions">
          <div className="search-bar">
            <input
              className="search-input"
              type="text"
              placeholder={`Search ${title.toLowerCase()}...`}
              value={searchQuery}
              onChange={handleSearch}
            />
          </div>
          <button className="btn-add btn-primary" onClick={handleOpenCreate}>
            + Add New
          </button>
        </div>
      </div>

      {loading && items.length === 0 ? (
        <div className="loading-spinner">
          <div className="spinner" />
          <p>Loading {title.toLowerCase()}...</p>
        </div>
      ) : (
        renderTable()
      )}

      {renderDetailModal()}
      {renderFormModal()}
    </div>
  );
};

export default FeaturePage;
