import React, { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  Phone,
  Truck,
  Star,
  CheckCircle2,
  XCircle,
  Edit2,
  Trash2,
  Search,
  RefreshCw,
  X,
  Check,
  Shield,
} from 'lucide-react';
import { DeliveryPartner } from '../types';
import {
  fetchDeliveryPartners,
  saveDeliveryPartner,
  togglePartnerActiveStatus,
  deleteDeliveryPartner,
  clearAllDeliveryPartners,
} from '../services/deliveryService';

export const DeliveryPartnersPage: React.FC = () => {
  const [partners, setPartners] = useState<DeliveryPartner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState<DeliveryPartner | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [vehicleType, setVehicleType] = useState<'bike' | 'scooter' | 'van' | 'truck'>('bike');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const list = await fetchDeliveryPartners();
      setPartners(list);
    } catch (err) {
      console.error('Failed to load partners:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenAdd = () => {
    setEditingPartner(null);
    setName('');
    setPhone('');
    setVehicleType('bike');
    setVehicleNumber('');
    setIsActive(true);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (partner: DeliveryPartner) => {
    setEditingPartner(partner);
    setName(partner.name);
    setPhone(partner.phone);
    setVehicleType(partner.vehicle_type as any);
    setVehicleNumber(partner.vehicle_number || '');
    setIsActive(partner.is_active);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      alert('Name and Phone are required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const saved = await saveDeliveryPartner({
        id: editingPartner?.id,
        name: name.trim(),
        phone: phone.trim(),
        vehicle_type: vehicleType,
        vehicle_number: vehicleNumber.trim() || undefined,
        is_active: isActive,
        rating: editingPartner?.rating || 5.0,
        total_completed: editingPartner?.total_completed || 0,
      });

      setPartners((prev) => {
        if (editingPartner) {
          return prev.map((p) => (p.id === saved.id ? saved : p));
        }
        return [saved, ...prev];
      });

      setIsModalOpen(false);
    } catch (err: any) {
      alert(err.message || 'Failed to save delivery partner');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (partner: DeliveryPartner) => {
    try {
      const updated = await togglePartnerActiveStatus(partner.id, !partner.is_active);
      setPartners((prev) => prev.map((p) => (p.id === partner.id ? { ...p, is_active: !p.is_active } : p)));
    } catch (err: any) {
      alert(err.message || 'Failed to update partner status');
    }
  };

  const handleDeletePartner = async (partner: DeliveryPartner) => {
    if (!window.confirm(`Are you sure you want to remove delivery partner "${partner.name}" from the fleet?`)) {
      return;
    }
    try {
      await deleteDeliveryPartner(partner.id);
      setPartners((prev) => prev.filter((p) => p.id !== partner.id));
    } catch (err: any) {
      alert(err.message || 'Failed to remove delivery partner');
    }
  };

  const handleClearAllFleet = async () => {
    if (!window.confirm('Are you sure you want to remove all delivery partners from the fleet?')) {
      return;
    }
    try {
      await clearAllDeliveryPartners();
      setPartners([]);
    } catch (err: any) {
      alert(err.message || 'Failed to clear delivery partners');
    }
  };

  const filteredPartners = partners.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.phone.toLowerCase().includes(q) ||
      p.vehicle_type?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-serif-display font-bold text-slate-900 text-2xl tracking-tight">
              Delivery Partner Fleet Profiles
            </h1>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              {partners.filter((p) => p.is_active).length} Active Riders
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Manage dispatch fleet personnel, contact details, vehicle registration, and activity status.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {partners.length > 0 && (
            <button
              type="button"
              onClick={handleClearAllFleet}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg hover:bg-rose-100 shadow-xs transition"
              title="Remove all riders from fleet"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear Fleet
            </button>
          )}
          <button
            type="button"
            onClick={loadData}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 shadow-xs transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            type="button"
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs transition"
          >
            <Plus className="w-4 h-4" /> Add Delivery Partner
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search rider name, phone number, vehicle..."
          className="w-full pl-9 pr-4 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 bg-white"
        />
      </div>

      {/* Partner Profiles Grid */}
      {isLoading ? (
        <div className="py-16 text-center text-slate-400 text-sm">Loading delivery fleet...</div>
      ) : filteredPartners.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="font-serif-display font-semibold text-slate-900 text-base">No partners found</h3>
          <p className="text-xs text-slate-500 mt-1">
            Click &quot;Add Delivery Partner&quot; above to register your first rider.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPartners.map((partner) => (
            <div
              key={partner.id}
              className={`bg-white border rounded-2xl p-5 shadow-xs flex flex-col justify-between transition hover:shadow-md ${
                !partner.is_active ? 'border-slate-200 bg-slate-50/40 opacity-75' : 'border-slate-200'
              }`}
            >
              <div>
                {/* Card Top */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                        partner.is_active
                          ? 'bg-cyan-600 text-white shadow-xs'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {partner.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 text-sm">{partner.name}</h3>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                        <span className="font-mono-code uppercase text-[10px] px-1.5 py-0.2 bg-slate-100 rounded text-slate-700 font-semibold">
                          {partner.vehicle_type}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-0.5 text-amber-600 font-semibold text-xs">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          {partner.rating.toFixed(1)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleToggleStatus(partner)}
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full border transition cursor-pointer ${
                      partner.is_active
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-rose-50 hover:text-rose-800 hover:border-rose-200'
                        : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-emerald-50 hover:text-emerald-800'
                    }`}
                  >
                    {partner.is_active ? 'Active' : 'Offline'}
                  </button>
                </div>

                {/* Details Section */}
                <div className="py-3 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Phone Number:</span>
                    <a
                      href={`tel:${partner.phone}`}
                      className="font-mono-code font-semibold text-cyan-700 hover:underline flex items-center gap-1"
                    >
                      <Phone className="w-3 h-3" /> {partner.phone}
                    </a>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Vehicle Plate / ID:</span>
                    <span className="font-mono-code text-slate-800 font-medium">
                      {partner.vehicle_number || 'Not registered'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Completed Trips:</span>
                    <span className="font-mono-code font-bold text-slate-900">
                      {partner.total_completed} deliveries
                    </span>
                  </div>
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => handleDeletePartner(partner)}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-rose-600 hover:text-rose-750 hover:bg-rose-50 rounded-lg transition"
                  title="Remove Rider from Fleet"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Remove
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenEdit(partner)}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                >
                  <Edit2 className="w-3.5 h-3.5" /> Edit Profile
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Partner Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-slate-700" />
                <h3 className="font-serif-display font-semibold text-slate-900 text-base">
                  {editingPartner ? 'Edit Delivery Partner' : 'Add New Delivery Partner'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Ramesh Kumar"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Contact Phone Number *
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full px-3 py-2 text-sm font-mono-code border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Vehicle Type</label>
                  <select
                    value={vehicleType}
                    onChange={(e) => setVehicleType(e.target.value as any)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden bg-white"
                  >
                    <option value="bike">Motorcycle (Bike)</option>
                    <option value="scooter">Electric Scooter</option>
                    <option value="van">Delivery Van</option>
                    <option value="truck">Cargo Truck</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Vehicle Plate / ID</label>
                  <input
                    type="text"
                    value={vehicleNumber}
                    onChange={(e) => setVehicleNumber(e.target.value)}
                    placeholder="DL 01 AB 1234"
                    className="w-full px-3 py-2 text-sm font-mono-code uppercase border border-slate-300 rounded-lg focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="rounded text-cyan-600 focus:ring-cyan-500"
                  />
                  <span>Active & Available for Dispatch</span>
                </label>
              </div>

              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-cyan-700 hover:bg-cyan-800 rounded-lg shadow-xs transition disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  {isSubmitting ? 'Saving...' : 'Save Partner Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
