import React, { useMemo } from 'react';
import { useStore } from '../../../store/useStore';
import { useAccountForm } from './hooks/useAccountForm';
import { AccountFormValues } from './AccountTypes';
import {
  StandardMasterItem,
  City,
  State,
  Broker,
  Account
} from '@shared/types';
import { ERPInput } from '../shared/components/ERPInput';
import { ERPSelect } from '../shared/components/ERPSelect';
import { ERPRadioGroup } from '../shared/components/ERPRadioGroup';
import { ERPSection } from '../shared/components/ERPSection';
import { ERPFormRow } from '../shared/components/ERPFormRow';
import { Save, X, Edit2, Trash2, Users } from 'lucide-react';

interface AccountFormProps {
  initialValues: Partial<AccountFormValues>;
  lookupGroups: StandardMasterItem[];
  lookupCities: City[];
  lookupStates: State[];
  lookupBrokers: Broker[];
  dutiesAndTaxesAccounts: Account[];
  mode: 'view' | 'edit' | 'new';
  onSubmit: (values: AccountFormValues) => void;
  onCancel: () => void;
  onEditModeTrigger: () => void;
  onDeleteTrigger: () => void;
}

export const AccountForm: React.FC<AccountFormProps> = ({
  initialValues,
  lookupGroups,
  lookupCities,
  lookupStates,
  lookupBrokers,
  dutiesAndTaxesAccounts,
  mode,
  onSubmit,
  onCancel,
  onEditModeTrigger,
  onDeleteTrigger
}) => {
  const isViewMode = mode === 'view';

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isDirty }
  } = useAccountForm(initialValues);
  const { confirm } = useStore();

  const selectedGroup = watch('group_name');

  const activeConfig = useMemo(() => {
    const groupObj = lookupGroups.find(g => (g.name || (g as any).group_name) === selectedGroup) as any;
    if (!groupObj) {
      return {
        showMailingDetails: true,
        showStatutoryDetails: true,
        showBankingDetails: true,
        showTDSDetails: true
      };
    }
    return {
      showMailingDetails: groupObj.show_mailing !== 0,
      showStatutoryDetails: groupObj.show_statutory !== 0,
      showBankingDetails: groupObj.show_banking !== 0,
      showTDSDetails: groupObj.show_tds !== 0
    };
  }, [selectedGroup, lookupGroups]);

  const isAnySectionVisible = useMemo(() => {
    return (
      activeConfig.showMailingDetails ||
      activeConfig.showStatutoryDetails ||
      activeConfig.showBankingDetails ||
      activeConfig.showTDSDetails
    );
  }, [activeConfig]);

  const handleCancelClick = async () => {
    if (isDirty) {
      if (!(await confirm({ message: 'You have unsaved changes. Are you sure you want to discard them?' }))) {
        return;
      }
    }
    (window as any).isMastersDirty = false;
    onCancel();
  };

  return (
    <form 
      onSubmit={handleSubmit((values) => {
        (window as any).isMastersDirty = false;
        onSubmit(values as unknown as AccountFormValues);
      })} 
      className="flex flex-col gap-6 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm select-none text-xs"
    >
      {/* Action Header Bar */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-sm">
        <div>
          <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-500" />
            {mode === 'new' ? 'Register New Account' : mode === 'edit' ? `Edit Account: ${initialValues.name}` : `Account Profile: ${initialValues.name}`}
          </h2>
          <p className="text-[12px] text-slate-550 mt-0.5">
            {mode === 'new' 
              ? 'Create a new customer, supplier, bank or expense account' 
              : mode === 'edit' 
                ? 'Modify account parameters and validation requirements' 
                : 'View account configuration details'}
          </p>
        </div>
        
        <div className="flex gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleCancelClick}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 rounded-lg text-xs font-semibold shadow-sm transition-all active:scale-[0.98] cursor-pointer flex items-center"
          >
            <X className="w-3.5 h-3.5 mr-1.5" /> {mode === 'edit' ? 'Cancel' : 'Back to List'}
          </button>

          {isViewMode && (
            <>
              <button
                type="button"
                onClick={onEditModeTrigger}
                className="px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/50 rounded-lg text-xs font-semibold shadow-sm transition-all active:scale-[0.98] cursor-pointer flex items-center"
              >
                <Edit2 className="w-3.5 h-3.5 mr-1.5" /> Edit Details
              </button>
              <button
                type="button"
                onClick={onDeleteTrigger}
                className="px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-lg text-xs font-semibold shadow-sm transition-all active:scale-[0.98] cursor-pointer flex items-center"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Delete Account
              </button>
            </>
          )}

          {!isViewMode && (
            <button
              type="submit"
              className="px-4 py-1.5 bg-cyan-50 hover:bg-cyan-100 text-slate-700 border border-cyan-300 rounded-lg text-xs font-bold shadow-sm transition-all active:scale-[0.98] cursor-pointer flex items-center"
            >
              <Save className="w-3.5 h-3.5 mr-1.5" /> Save Changes
            </button>
          )}
        </div>
      </div>

      {/* Top Level Core Information */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <ERPInput
            label="Account Name"
            required
            disabled={isViewMode}
            placeholder="e.g. Sri Krishna Fabrics"
            error={errors.name?.message}
            {...register('name')}
          />
          <ERPSelect
            label="Under Group"
            required
            disabled={isViewMode}
            options={[
              { value: '', label: '-- Select Group --' },
              ...lookupGroups.map((g) => ({ value: g.name || g.group_name || '', label: g.name || g.group_name || '' }))
            ]}
            error={errors.group_name?.message}
            {...register('group_name')}
          />
          <div className="flex flex-col gap-1.5 justify-end">
            <span className="font-bold text-slate-500 uppercase tracking-wider text-[11px]">Status</span>
            <div className="h-7 px-3 bg-emerald-50 border border-emerald-250 text-emerald-700 font-bold rounded flex items-center w-fit text-xs select-none">
              Active
            </div>
          </div>
        </div>
      </div>

      {/* Form Content Area: Dynamic Independent Cards Grid */}
      {isAnySectionVisible ? (
        <div className="grid grid-cols-1 2xl:grid-cols-2 gap-6 items-start">
          
          {/* Mailing Details Card */}
          {activeConfig && activeConfig.showMailingDetails && (
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
              <ERPSection 
                title="Mailing Details" 
                visible={true}
                titleClassName="text-indigo-700 border-slate-100"
              >
                <ERPFormRow>
                  <label className="font-bold text-slate-700 select-none">
                    Address
                  </label>
                  <div className="flex flex-col gap-2">
                    <ERPInput
                      label=""
                      disabled={isViewMode}
                      placeholder="Address Line 1"
                      error={errors.addressLine1?.message}
                      {...register('addressLine1')}
                    />
                    <ERPInput
                      label=""
                      disabled={isViewMode}
                      placeholder="Address Line 2"
                      error={errors.addressLine2?.message}
                      {...register('addressLine2')}
                    />
                  </div>

                  <label className="font-bold text-slate-700 select-none">
                    City
                  </label>
                  <div className="flex flex-col gap-2">
                    <select
                      disabled={isViewMode}
                      className={`flex-1 px-2 py-1 text-xs bg-white border border-[#cfc0ae] focus:border-indigo-500 rounded outline-none h-7 cursor-pointer disabled:bg-slate-100 disabled:text-slate-500 font-semibold ${
                        errors.city ? 'border-red-500 bg-red-50/20' : ''
                      }`}
                      {...register('city')}
                    >
                      <option value="">-- Select City --</option>
                      {lookupCities.map((c) => (
                        <option key={c.id} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                    <div className="flex items-center border border-[#cfc0ae] rounded overflow-hidden h-7">
                      <span className="bg-[#ebdccb] px-2 text-[11px] font-bold text-slate-700 h-full flex items-center select-none">Pin</span>
                      <input
                        type="text"
                        disabled={isViewMode}
                        placeholder="Pin Code"
                        className="w-20 px-2 text-xs outline-none h-full disabled:bg-slate-100 disabled:text-slate-500 font-semibold"
                        {...register('pin_code')}
                      />
                    </div>
                  </div>
                  {errors.city && <span className="col-start-2 text-[11px] text-red-550 font-bold">{errors.city.message}</span>}
                  {errors.pin_code && <span className="col-start-2 text-[11px] text-red-550 font-bold">{errors.pin_code.message}</span>}

                  <label className="font-bold text-slate-700 select-none">Dist / Taluka</label>
                  <ERPInput
                    label=""
                    disabled={isViewMode}
                    placeholder="e.g. BHIWANDI"
                    error={errors.dist_taluka?.message}
                    {...register('dist_taluka')}
                  />

                  <label className="font-bold text-slate-700 select-none">State</label>
                  <select
                    disabled={isViewMode}
                    className={`w-full px-2 py-1 text-xs bg-white border border-[#cfc0ae] focus:border-indigo-500 rounded outline-none h-7 cursor-pointer disabled:bg-slate-100 disabled:text-slate-500 font-semibold ${
                      errors.state ? 'border-red-500 bg-red-50/20' : ''
                    }`}
                    {...register('state')}
                  >
                    <option value="">-- Select State --</option>
                    {lookupStates.map((s) => (
                      <option key={s.id} value={s.name}>{s.name}</option>
                    ))}
                  </select>
                  {errors.state && <span className="col-start-2 text-[11px] text-red-550 font-bold">{errors.state.message}</span>}

                  <label className="font-bold text-slate-700 select-none">
                    Telephone / Mobile
                  </label>
                  <div className="flex flex-col gap-2">
                    <ERPInput
                      label=""
                      disabled={isViewMode}
                      placeholder="Telephone No."
                      error={errors.telephone_no?.message}
                      {...register('telephone_no')}
                    />
                    <div className="flex items-center border border-[#cfc0ae] rounded overflow-hidden h-7">
                      <span className="bg-[#ebdccb] px-2 text-[11px] font-bold text-slate-700 h-full flex items-center select-none">Mobile</span>
                      <input
                        type="text"
                        disabled={isViewMode}
                        placeholder="Mobile No."
                        className="w-full px-2 text-xs outline-none h-full disabled:bg-slate-100 disabled:text-slate-500 font-semibold"
                        {...register('mobile_number')}
                      />
                    </div>
                  </div>
                  {errors.mobile_number && <span className="col-start-2 text-[11px] text-red-550 font-bold">{errors.mobile_number.message}</span>}

                  <label className="font-bold text-slate-700 select-none">Contact Person</label>
                  <ERPInput
                    label=""
                    disabled={isViewMode}
                    placeholder="Contact Person Name"
                    error={errors.contact_person?.message}
                    {...register('contact_person')}
                  />

                  <label className="font-bold text-slate-700 select-none">E-mail ID</label>
                  <ERPInput
                    label=""
                    type="email"
                    disabled={isViewMode}
                    placeholder="Email address"
                    error={errors.email?.message}
                    {...register('email')}
                  />
                </ERPFormRow>
              </ERPSection>
            </div>
          )}

          {/* Statutory Details Card */}
          {activeConfig && activeConfig.showStatutoryDetails && (
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
              <ERPSection 
                title="Statutory Details" 
                visible={true}
                titleClassName="text-indigo-700 border-slate-100"
              >
                <ERPFormRow>
                  <label className="font-bold text-slate-700 select-none">
                    GST No.
                  </label>
                  <ERPInput
                    label=""
                    disabled={isViewMode}
                    placeholder="GSTIN Number"
                    error={errors.gst_number?.message}
                    {...register('gst_number')}
                  />

                  <label className="font-bold text-slate-700 select-none">
                    PAN No.
                  </label>
                  <ERPInput
                    label=""
                    disabled={isViewMode}
                    placeholder="PAN Number"
                    error={errors.pan_no?.message}
                    {...register('pan_no')}
                  />

                  <label className="font-bold text-slate-700 select-none">VAT / CST TIN</label>
                  <div className="flex flex-col gap-2">
                    <ERPInput
                      label=""
                      disabled={isViewMode}
                      placeholder="VAT TIN"
                      error={errors.vat_tin_no?.message}
                      {...register('vat_tin_no')}
                    />
                    <div className="flex items-center border border-[#cfc0ae] rounded overflow-hidden h-7">
                      <span className="bg-[#ebdccb] px-2 text-[11px] font-bold text-slate-700 h-full flex items-center select-none">CST</span>
                      <input
                        type="text"
                        disabled={isViewMode}
                        placeholder="CST TIN"
                        className="w-full px-2 text-xs outline-none h-full disabled:bg-slate-100 disabled:text-slate-500 font-semibold"
                        {...register('cst_tin_no')}
                      />
                    </div>
                  </div>

                  <label className="font-bold text-slate-700 select-none">Account Type *</label>
                  <ERPRadioGroup
                    label=""
                    options={[
                      { value: 'Local', label: 'Local' },
                      { value: 'Out of State', label: 'Out of State' }
                    ]}
                    disabled={isViewMode}
                    error={errors.account_type?.message}
                    {...register('account_type')}
                  />

                  <label className="font-bold text-slate-700 select-none">
                    Broker
                  </label>
                  <select
                    disabled={isViewMode}
                    className={`w-full px-2 py-1 text-xs bg-white border border-[#cfc0ae] focus:border-indigo-500 rounded outline-none h-7 cursor-pointer disabled:bg-slate-100 disabled:text-slate-500 font-semibold ${
                      errors.broker ? 'border-red-500 bg-red-50/20' : ''
                    }`}
                    {...register('broker')}
                  >
                    <option value="">-- Select Broker / SELF --</option>
                    {lookupBrokers.map((b) => (
                      <option key={b.id} value={b.name}>{b.name}</option>
                    ))}
                  </select>
                  {errors.broker && <span className="col-start-2 text-[11px] text-red-550 font-bold">{errors.broker.message}</span>}

                  <label className="font-bold text-slate-700 select-none">
                    Credit Days
                  </label>
                  <ERPInput
                    label=""
                    type="number"
                    disabled={isViewMode}
                    error={errors.credit_days?.message}
                    {...register('credit_days')}
                  />
                </ERPFormRow>
              </ERPSection>
            </div>
          )}

          {/* Banking Details Card */}
          {activeConfig && activeConfig.showBankingDetails && (
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
              <ERPSection 
                title="Banking Details" 
                visible={true}
                titleClassName="text-indigo-700 border-slate-100"
              >
                <ERPFormRow>
                  <label className="font-bold text-slate-700 select-none">Bank Name</label>
                  <ERPInput
                    label=""
                    disabled={isViewMode}
                    placeholder="e.g. State Bank of India"
                    error={errors.bank_name?.message}
                    {...register('bank_name')}
                  />

                  <label className="font-bold text-slate-700 select-none">Bank Branch</label>
                  <ERPInput
                    label=""
                    disabled={isViewMode}
                    placeholder="Branch location"
                    error={errors.bank_branch?.message}
                    {...register('bank_branch')}
                  />

                  <label className="font-bold text-slate-700 select-none">Bank Account No.</label>
                  <ERPInput
                    label=""
                    disabled={isViewMode}
                    placeholder="Account Number"
                    error={errors.bank_account_no?.message}
                    {...register('bank_account_no')}
                  />

                  <label className="font-bold text-slate-700 select-none">Bank IFSC</label>
                  <ERPInput
                    label=""
                    disabled={isViewMode}
                    placeholder="IFSC Code"
                    error={errors.bank_ifsc?.message}
                    {...register('bank_ifsc')}
                  />

                  <label className="font-bold text-slate-700 select-none">Account Holder</label>
                  <ERPInput
                    label=""
                    disabled={isViewMode}
                    placeholder="Holder Name"
                    error={errors.bank_account_holder?.message}
                    {...register('bank_account_holder')}
                  />
                </ERPFormRow>
              </ERPSection>
            </div>
          )}

          {/* TDS Details Card */}
          {activeConfig && activeConfig.showTDSDetails && (
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
              <ERPSection 
                title="TDS Details" 
                visible={true}
                titleClassName="text-indigo-700 border-slate-100"
              >
                <ERPFormRow>
                  <label className="font-bold text-slate-700 select-none">TDS Rate (%)</label>
                  <ERPInput
                    label=""
                    type="number"
                    step="0.001"
                    disabled={isViewMode}
                    placeholder="0.000"
                    error={errors.tds_rate?.message}
                    {...register('tds_rate')}
                  />

                  <label className="font-bold text-slate-700 select-none">TDS A/c</label>
                  <select
                    disabled={isViewMode}
                    className={`w-full px-2 py-1 text-xs bg-white border border-[#cfc0ae] focus:border-indigo-500 rounded outline-none h-7 cursor-pointer disabled:bg-slate-100 disabled:text-slate-500 font-semibold ${
                      errors.tds_ledger ? 'border-red-500 bg-red-50/20' : ''
                    }`}
                    {...register('tds_ledger')}
                  >
                    <option value="">-- Select TDS A/c --</option>
                    {dutiesAndTaxesAccounts.map((a) => (
                      <option key={a.id} value={a.name}>{a.name}</option>
                    ))}
                    <option value="TDS A/c">TDS A/c</option>
                  </select>
                  {errors.tds_ledger && <span className="col-start-2 text-[11px] text-red-550 font-bold">{errors.tds_ledger.message}</span>}
                </ERPFormRow>
              </ERPSection>
            </div>
          )}

        </div>
      ) : (
        /* PRINT ORDER Card for when no other detail blocks are selected */
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm max-w-md">
          <ERPInput
            label="Print Order"
            disabled={isViewMode}
            placeholder="e.g. 1, 2, 3..."
            error={errors.print_order?.message}
            {...register('print_order')}
          />
        </div>
      )}
    </form>
  );
};
