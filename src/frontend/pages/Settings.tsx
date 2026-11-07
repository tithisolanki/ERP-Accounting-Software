import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { CompanyService, AuthService } from '../services/api';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Select } from '../components/Select';
import { Table } from '../components/Table';
import { Save, Key, UserPlus, Trash2 } from 'lucide-react';

export const Settings: React.FC = () => {
  const { token, user, company, addNotification } = useStore();
  const isAdmin = user?.role === 'ADMIN';

  // Company details form fields
  const [companyName, setCompanyName] = useState('');
  const [companyCode, setCompanyCode] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [panNumber, setPanNumber] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [bank1Name, setBank1Name] = useState('');
  const [bank1AccountNo, setBank1AccountNo] = useState('');
  const [bank1Ifsc, setBank1Ifsc] = useState('');
  const [bank2Name, setBank2Name] = useState('');
  const [bank2AccountNo, setBank2AccountNo] = useState('');
  const [bank2Ifsc, setBank2Ifsc] = useState('');
  const [creditInterestRate, setCreditInterestRate] = useState('');

  // Password state
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [updatingPass, setUpdatingPass] = useState(false);
  const [savingDetails, setSavingDetails] = useState(false);

  // User Accounts Management state
  const [usersList, setUsersList] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [newUserUsername, setNewUserUsername] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserRole, setNewUserRole] = useState<'ADMIN' | 'USER'>('USER');
  const [creatingUser, setCreatingUser] = useState(false);

  // Load company settings
  useEffect(() => {
    loadCompanyData();
    if (isAdmin) {
      loadUsers();
    }
  }, [isAdmin]);

  const loadCompanyData = async () => {
    if (!token || !company?.id) return;
    try {
      const list = await CompanyService.getAll(token);
      const activeCompany = list.find((c) => c.id === company.id);
      if (activeCompany) {
        setCompanyName(activeCompany.name || '');
        setCompanyCode(activeCompany.code || '');
        setGstNumber(activeCompany.gst_number || '');
        setPanNumber(activeCompany.pan_number || '');
        setAddress(activeCompany.address || '');
        setPhone(activeCompany.phone || '');
        setEmail(activeCompany.email || '');
        setBank1Name(activeCompany.bank1_name || '');
        setBank1AccountNo(activeCompany.bank1_account_no || '');
        setBank1Ifsc(activeCompany.bank1_ifsc || '');
        setBank2Name(activeCompany.bank2_name || '');
        setBank2AccountNo(activeCompany.bank2_account_no || '');
        setBank2Ifsc(activeCompany.bank2_ifsc || '');
        setCreditInterestRate(activeCompany.credit_interest_rate != null ? String(activeCompany.credit_interest_rate) : '');
      }
    } catch {
      addNotification('error', 'Failed to load company details.');
    }
  };

  const loadUsers = async () => {
    if (!token) return;
    setLoadingUsers(true);
    try {
      const list = await CompanyService.getUsers(token);
      setUsersList(list);
    } catch {
      addNotification('error', 'Failed to load user accounts.');
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleSaveCompanyDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin || !company?.id) return;

    setSavingDetails(true);
    try {
      const updated = await CompanyService.update(company.id, {
        name: companyName,
        gst_number: gstNumber,
        pan_number: panNumber,
        address,
        phone,
        email,
        bank1_name: bank1Name,
        bank1_account_no: bank1AccountNo,
        bank1_ifsc: bank1Ifsc,
        bank2_name: bank2Name,
        bank2_account_no: bank2AccountNo,
        bank2_ifsc: bank2Ifsc,
        credit_interest_rate: creditInterestRate ? Number(creditInterestRate) : undefined
      }, token!);

      addNotification('success', 'Company details updated successfully.');
      
      // Update stored company cache
      sessionStorage.setItem('texfin_company', JSON.stringify(updated));
      setTimeout(() => window.location.reload(), 1000);
    } catch (err: any) {
      addNotification('error', err.message);
    } finally {
      setSavingDetails(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPass !== confirmPass) {
      addNotification('error', 'Passwords do not match.');
      return;
    }

    setUpdatingPass(true);
    try {
      await AuthService.changePassword(token!, { currentPassword: currentPass, newPassword: newPass });

      addNotification('success', 'Password updated successfully.');
      setCurrentPass('');
      setNewPass('');
      setConfirmPass('');
    } catch (err: any) {
      addNotification('error', err.message);
    } finally {
      setUpdatingPass(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin || !token) return;

    setCreatingUser(true);
    try {
      await CompanyService.createUser({
        username: newUserUsername,
        password: newUserPassword,
        name: newUserName,
        role: newUserRole,
        targetCompanyId: company?.id || ''
      }, token);

      addNotification('success', `User account "${newUserUsername}" created successfully.`);
      setNewUserUsername('');
      setNewUserPassword('');
      setNewUserName('');
      setNewUserRole('USER');
      await loadUsers();
    } catch (err: any) {
      addNotification('error', err.message);
    } finally {
      setCreatingUser(false);
    }
  };

  const handleDeleteUser = async (userId: string, username: string) => {
    if (!isAdmin || !token) return;
    if (userId === user?.id) {
      addNotification('error', 'Cannot delete your own active account.');
      return;
    }
    if (!window.confirm(`Are you sure you want to delete user account "${username}"?`)) {
      return;
    }

    try {
      await CompanyService.deleteUser(userId, token);
      addNotification('success', `User account "${username}" deleted successfully.`);
      await loadUsers();
    } catch (err: any) {
      addNotification('error', err.message);
    }
  };

  return (
    <div className="flex flex-col gap-5 select-none text-xs">
      {/* Title */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm">
        <h1 className="text-sm font-bold text-slate-800 tracking-tight">Company Settings</h1>
        <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Edit company profiles, tax settings, and manage user accounts</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Left Column: Company profile details */}
        <Card title="Firm Profile Details" subtitle="Manage registered company name, tax, and address fields">
          <form onSubmit={handleSaveCompanyDetails} className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Company Name"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                required
                disabled={!isAdmin}
                className={!isAdmin ? 'bg-slate-100/60' : ''}
              />
              <Input
                label="Company Code (Read-Only)"
                value={companyCode}
                disabled
                className="bg-slate-100/60"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="GSTIN Number"
                value={gstNumber}
                onChange={(e) => setGstNumber(e.target.value)}
                placeholder="24AAAAA1111A1Z1"
                disabled={!isAdmin}
                className={!isAdmin ? 'bg-slate-100/60' : ''}
              />
              <Input
                label="PAN Number"
                value={panNumber}
                onChange={(e) => setPanNumber(e.target.value)}
                placeholder="ABCDE1234F"
                disabled={!isAdmin}
                className={!isAdmin ? 'bg-slate-100/60' : ''}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Phone Number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="9876543210"
                disabled={!isAdmin}
                className={!isAdmin ? 'bg-slate-100/60' : ''}
              />
              <Input
                label="Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="contact@company.com"
                type="email"
                disabled={!isAdmin}
                className={!isAdmin ? 'bg-slate-100/60' : ''}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-semibold text-slate-500 uppercase tracking-wider">Billing & Registered Address</label>
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                rows={3}
                disabled={!isAdmin}
                placeholder="Enter complete company registered address..."
                className={`w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg outline-none outline-0 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/25 transition-all shadow-sm text-slate-800 animate-none ${
                  !isAdmin ? 'bg-slate-100/60 cursor-not-allowed' : 'bg-slate-50/50 hover:bg-slate-50 focus:bg-white'
                }`}
              />
            </div>

            <div className="flex flex-col gap-1.5 pt-2 border-t border-slate-100">
              <label className="text-[12px] font-semibold text-slate-500 uppercase tracking-wider">Bank &amp; Invoice Terms (printed on Sales Invoice)</label>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <Input
                label="Bank 1 Name"
                value={bank1Name}
                onChange={(e) => setBank1Name(e.target.value)}
                placeholder="IDBI BANK"
                disabled={!isAdmin}
                className={!isAdmin ? 'bg-slate-100/60' : ''}
              />
              <Input
                label="Bank 1 Account No."
                value={bank1AccountNo}
                onChange={(e) => setBank1AccountNo(e.target.value)}
                disabled={!isAdmin}
                className={!isAdmin ? 'bg-slate-100/60' : ''}
              />
              <Input
                label="Bank 1 IFSC"
                value={bank1Ifsc}
                onChange={(e) => setBank1Ifsc(e.target.value)}
                disabled={!isAdmin}
                className={!isAdmin ? 'bg-slate-100/60' : ''}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <Input
                label="Bank 2 Name"
                value={bank2Name}
                onChange={(e) => setBank2Name(e.target.value)}
                placeholder="ICICI BANK"
                disabled={!isAdmin}
                className={!isAdmin ? 'bg-slate-100/60' : ''}
              />
              <Input
                label="Bank 2 Account No."
                value={bank2AccountNo}
                onChange={(e) => setBank2AccountNo(e.target.value)}
                disabled={!isAdmin}
                className={!isAdmin ? 'bg-slate-100/60' : ''}
              />
              <Input
                label="Bank 2 IFSC"
                value={bank2Ifsc}
                onChange={(e) => setBank2Ifsc(e.target.value)}
                disabled={!isAdmin}
                className={!isAdmin ? 'bg-slate-100/60' : ''}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Credit Interest Rate (%)"
                value={creditInterestRate}
                onChange={(e) => setCreditInterestRate(e.target.value)}
                placeholder="24"
                type="number"
                disabled={!isAdmin}
                className={!isAdmin ? 'bg-slate-100/60' : ''}
              />
            </div>

            {isAdmin && (
              <div className="flex justify-end mt-2">
                <Button type="submit" variant="primary" disabled={savingDetails} className="cursor-pointer font-bold text-xs py-1.5 px-4 h-9">
                  <Save className="w-4 h-4 mr-1.5" /> {savingDetails ? 'Saving...' : 'Save Company Details'}
                </Button>
              </div>
            )}
          </form>
        </Card>

        {/* Right Column: Security Configurations */}
        <div className="flex flex-col gap-6">
          <Card title="Change User Password" subtitle="Update account login credentials">
            <form onSubmit={handlePasswordChange} className="flex flex-col gap-4">
              <Input
                label="Current Password"
                type="password"
                value={currentPass}
                onChange={(e) => setCurrentPass(e.target.value)}
                required
              />
              <Input
                label="New Password"
                type="password"
                value={newPass}
                onChange={(e) => setNewPass(e.target.value)}
                required
              />
              <Input
                label="Confirm New Password"
                type="password"
                value={confirmPass}
                onChange={(e) => setConfirmPass(e.target.value)}
                required
              />
              
              <div className="flex justify-end mt-2">
                <Button type="submit" variant="primary" disabled={updatingPass} className="cursor-pointer font-bold text-xs py-1.5 px-4 h-9">
                  <Key className="w-4 h-4 mr-1.5" /> {updatingPass ? 'Updating...' : 'Update Password'}
                </Button>
              </div>
            </form>
          </Card>

          {/* User Management Section (Admins Only) */}
          {isAdmin && (
            <Card title="User Accounts Management" subtitle="Manage and create user accounts for your firm profile">
              <div className="flex flex-col gap-6">
                
                {/* Add User Form */}
                <form onSubmit={handleCreateUser} className="bg-slate-50 border border-slate-200/60 rounded-xl p-4 flex flex-col gap-4">
                  <h3 className="font-bold text-slate-800 text-[12px] uppercase tracking-wider flex items-center gap-1.5">
                    <UserPlus className="w-4 h-4 text-blue-600" /> Create New User Profile
                  </h3>

                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="Full Profile Name"
                      type="text"
                      value={newUserName}
                      onChange={(e) => setNewUserName(e.target.value)}
                      placeholder="e.g. John Doe"
                      required
                    />
                    <Input
                      label="Security Username"
                      type="text"
                      value={newUserUsername}
                      onChange={(e) => setNewUserUsername(e.target.value)}
                      placeholder="e.g. johndoe"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="Account Password"
                      type="password"
                      value={newUserPassword}
                      onChange={(e) => setNewUserPassword(e.target.value)}
                      placeholder="Min 6 characters"
                      required
                    />
                    <Select
                      label="Assigned System Role"
                      value={newUserRole}
                      onChange={(e) => setNewUserRole(e.target.value as 'ADMIN' | 'USER')}
                      options={[
                        { value: 'USER', label: 'Company User (Read/Write limits)' },
                        { value: 'ADMIN', label: 'Company Administrator (Full access)' }
                      ]}
                    />
                  </div>

                  <div className="flex justify-end mt-1">
                    <Button type="submit" variant="primary" disabled={creatingUser} className="cursor-pointer font-bold text-xs py-1.5 px-4 h-8.5">
                      Create User Account
                    </Button>
                  </div>
                </form>

                {/* User List */}
                <div className="flex flex-col gap-2">
                  <h3 className="font-bold text-slate-700 text-[11px] uppercase tracking-wider">Active User Accounts</h3>
                  {loadingUsers ? (
                    <div className="text-center py-6 text-slate-400 font-semibold animate-pulse">Loading accounts...</div>
                  ) : usersList.length > 0 ? (
                    <Table headers={['Name', 'Username', 'Role', 'Actions']}>
                      {usersList.map((u) => (
                        <tr key={u.id} className="hover:bg-slate-50/50">
                          <td className="px-4 py-2 font-bold text-slate-700">{u.name}</td>
                          <td className="px-4 py-2 text-slate-500">{u.username}</td>
                          <td className="px-4 py-2 font-extrabold">
                            <span className={`px-2 py-0.5 rounded-full text-[11px] uppercase tracking-widest ${
                              u.role === 'ADMIN' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-slate-50 text-slate-700 border border-slate-200'
                            }`}>
                              {u.role}
                            </span>
                          </td>
                          <td className="px-4 py-2">
                            {u.id !== user?.id ? (
                              <button
                                type="button"
                                onClick={() => handleDeleteUser(u.id, u.username)}
                                className="p-1 text-red-500 hover:bg-red-50 rounded-lg hover:text-red-700 cursor-pointer"
                                title="Delete User Account"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            ) : (
                              <span className="text-[11px] text-slate-400 font-semibold italic">Current User</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </Table>
                  ) : (
                    <div className="text-center py-6 text-slate-400">No user accounts found.</div>
                  )}
                </div>

              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};
