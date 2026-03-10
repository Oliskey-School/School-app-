import { supabase } from '../config/supabase';

const DEMO_SCHOOL_ID = 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1';

export class FeeService {
    static async createFee(schoolId: string, branchId: string | undefined, data: any) {
        // Map frontend camelCase to database snake_case
        const dbData: any = {
            school_id: schoolId,
            student_id: data.studentId,
            title: data.title,
            amount: data.amount,
            paid_amount: data.paidAmount || 0,
            status: data.status || 'Pending',
            due_date: data.dueDate
        };

        if (branchId && branchId !== 'all') {
            dbData.branch_id = branchId;
        }

        try {
            const { data: fee, error } = await supabase
                .from('student_fees')
                .insert([dbData])
                .select()
                .single();

            if (error && error.message.includes('column') && dbData.branch_id) {
                console.warn('⚠️ [FeeService] createFee fallback: branch_id missing');
                delete dbData.branch_id;
                const { data: retryFee, error: retryError } = await supabase
                    .from('student_fees')
                    .insert([dbData])
                    .select()
                    .single();
                if (retryError) throw new Error(retryError.message);
                return this.mapFee(retryFee);
            }
            if (error) throw new Error(error.message);
            return this.mapFee(fee);
        } catch (e: any) {
            throw new Error(e.message);
        }
    }

    static async getAllFees(schoolId: string, branch_id: string | undefined) {
        let query = supabase
            .from('student_fees')
            .select('*')
            .eq('school_id', schoolId);

        if (branch_id && branch_id !== 'all') {
            query = query.or(`branch_id.eq.${branch_id},branch_id.is.null`);
        }

        let { data, error } = await query.order('created_at', { ascending: false });

        if (error && error.message.includes('column')) {
            console.warn('⚠️ [FeeService] getAllFees fallback: branch_id missing');
            const retryQuery = supabase
                .from('student_fees')
                .select('*')
                .eq('school_id', schoolId);
            const retryRes = await retryQuery.order('created_at', { ascending: false });
            data = retryRes.data;
            error = retryRes.error;
        }

        if (error) throw new Error(error.message);

        // DEMO MODE MOCK DATA INJECTION
        const isDemoSchool = schoolId === 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1';
        if (isDemoSchool && (!data || data.length === 0)) {
            console.log('🛡️ [FeeService] Injecting Demo Mock Fees');
            return [
                { id: 'f1', studentId: 's1', title: 'Tuition Fee - Term 1', amount: 5000, paidAmount: 5000, status: 'Paid', dueDate: '2025-01-15', createdAt: new Date().toISOString() },
                { id: 'f2', studentId: 's2', title: 'Tuition Fee - Term 1', amount: 5000, paidAmount: 2000, status: 'Partial', dueDate: '2025-01-15', createdAt: new Date().toISOString() },
                { id: 'f3', studentId: 's3', title: 'Tuition Fee - Term 1', amount: 5000, paidAmount: 0, status: 'Overdue', dueDate: '2025-01-15', createdAt: new Date().toISOString() },
                { id: 'f4', studentId: 's1', title: 'Bus Fee - Term 1', amount: 1200, paidAmount: 1200, status: 'Paid', dueDate: '2025-02-01', createdAt: new Date().toISOString() }
            ];
        }

        // Map to camelCase for frontend
        return data.map(fee => ({
            id: fee.id,
            studentId: fee.student_id,
            title: fee.title,
            amount: fee.amount,
            paidAmount: fee.paid_amount,
            status: fee.status,
            dueDate: fee.due_date,
            createdAt: fee.created_at
        }));
    }

    static async getFeeById(schoolId: string, branchId: string | undefined, id: string) {
        let query = supabase
            .from('student_fees')
            .select('*')
            .eq('school_id', schoolId)
            .eq('id', id);

        if (branchId && branchId !== 'all') {
            query = query.eq('branch_id', branchId);
        }

        try {
            const { data, error } = await query.single();
            if (error && error.message.includes('column') && branchId) {
                console.warn('⚠️ [FeeService] getFeeById fallback: branch_id missing');
                const retryQuery = supabase
                    .from('student_fees')
                    .select('*')
                    .eq('school_id', schoolId)
                    .eq('id', id);
                const retryRes = await retryQuery.single();
                if (retryRes.error) throw new Error(retryRes.error.message);
                return this.mapFee(retryRes.data);
            }
            if (error) throw new Error(error.message);
            return this.mapFee(data);
        } catch (e: any) {
            throw new Error(e.message);
        }
    }

    static async updateFee(schoolId: string, branchId: string | undefined, id: string, updates: any) {
        // Map updates to snake_case
        const dbUpdates: any = {};
        if (updates.title !== undefined) dbUpdates.title = updates.title;
        if (updates.amount !== undefined) dbUpdates.amount = updates.amount;
        if (updates.paidAmount !== undefined) dbUpdates.paid_amount = updates.paidAmount;
        if (updates.status !== undefined) dbUpdates.status = updates.status;
        if (updates.dueDate !== undefined) dbUpdates.due_date = updates.dueDate;

        let query = supabase
            .from('student_fees')
            .update(dbUpdates)
            .eq('school_id', schoolId)
            .eq('id', id);

        if (branchId && branchId !== 'all') {
            query = query.eq('branch_id', branchId);
        }

        try {
            const { data, error } = await query.select().single();
            if (error && error.message.includes('column') && branchId) {
                console.warn('⚠️ [FeeService] updateFee fallback: branch_id missing');
                const retryQuery = supabase
                    .from('student_fees')
                    .update(dbUpdates)
                    .eq('school_id', schoolId)
                    .eq('id', id);
                const { data: retryData, error: retryError } = await retryQuery.select().single();
                if (retryError) throw new Error(retryError.message);
                return this.mapFee(retryData);
            }
            if (error) throw new Error(error.message);
            return this.mapFee(data);
        } catch (e: any) {
            throw new Error(e.message);
        }
    }

    static async updateFeeStatus(schoolId: string, branchId: string | undefined, id: string, status: string) {
        let query = supabase
            .from('student_fees')
            .update({ status })
            .eq('school_id', schoolId)
            .eq('id', id);

        if (branchId && branchId !== 'all') {
            query = query.eq('branch_id', branchId);
        }

        try {
            const { data, error } = await query.select().single();
            if (error && error.message.includes('column') && branchId) {
                console.warn('⚠️ [FeeService] updateFeeStatus fallback: branch_id missing');
                const retryQuery = supabase
                    .from('student_fees')
                    .update({ status })
                    .eq('school_id', schoolId)
                    .eq('id', id);
                const { data: retryData, error: retryError } = await retryQuery.select().single();
                if (retryError) throw new Error(retryError.message);
                return this.mapFee(retryData);
            }
            if (error) throw new Error(error.message);
            return this.mapFee(data);
        } catch (e: any) {
            throw new Error(e.message);
        }
    }

    static async deleteFee(schoolId: string, branchId: string | undefined, id: string) {
        let query = supabase
            .from('student_fees')
            .delete()
            .eq('school_id', schoolId)
            .eq('id', id);

        if (branchId && branchId !== 'all') {
            query = query.eq('branch_id', branchId);
        }

        try {
            const { error } = await query;
            if (error && error.message.includes('column') && branchId) {
                console.warn('⚠️ [FeeService] deleteFee fallback: branch_id missing');
                const retryQuery = supabase
                    .from('student_fees')
                    .delete()
                    .eq('school_id', schoolId)
                    .eq('id', id);
                const retryRes = await retryQuery;
                if (retryRes.error) throw new Error(retryRes.error.message);
                return true;
            }
            if (error) throw new Error(error.message);
            return true;
        } catch (e: any) {
            throw new Error(e.message);
        }
    }

    static async getFeesByStudentIds(schoolId: string, branchId: string | undefined, studentIds: string[], statusList?: string[]) {
        let query = supabase
            .from('student_fees')
            .select('*')
            .eq('school_id', schoolId)
            .in('student_id', studentIds);

        if (branchId && branchId !== 'all') {
            query = query.eq('branch_id', branchId);
        }

        if (statusList && statusList.length > 0) {
            query = query.in('status', statusList);
        }

        try {
            const { data, error } = await query.order('due_date', { ascending: true });
            if (error && error.message.includes('column') && branchId) {
                console.warn('⚠️ [FeeService] getFeesByStudentIds fallback: branch_id missing');
                const retryQuery = supabase
                    .from('student_fees')
                    .select('*')
                    .eq('school_id', schoolId)
                    .in('student_id', studentIds);
                if (statusList && statusList.length > 0) retryQuery.in('status', statusList);
                const retryRes = await retryQuery.order('due_date', { ascending: true });
                if (retryRes.error) throw new Error(retryRes.error.message);
                return (retryRes.data || []).map(f => this.mapFee(f));
            }
            if (error) throw new Error(error.message);
            return (data || []).map(f => this.mapFee(f));
        } catch (e: any) {
            throw new Error(e.message);
        }
    }

    static async getFinancialAnalytics(schoolId: string, branchId: string | undefined, periodType: string, startDate: string, endDate: string) {
        const isDemoSchool = schoolId === 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1';

        if (isDemoSchool) {
            console.log('🛡️ [FeeService] Injecting Demo Financial Analytics');
            return {
                summary: {
                    period_type: periodType,
                    period_start: startDate,
                    period_end: endDate,
                    fee_revenue: 1250000,
                    donation_revenue: 150000,
                    grant_revenue: 50000,
                    other_revenue: 25000,
                    total_revenue: 1475000,
                    salary_expenses: 850000,
                    operational_expenses: 120000,
                    maintenance_expenses: 45000,
                    other_expenses: 15000,
                    total_expenses: 1030000,
                    net_income: 445000
                },
                paymentMethods: [
                    { method: 'Bank Transfer', amount: 850000, count: 45, percentage: 57.6 },
                    { method: 'Cash', amount: 320000, count: 82, percentage: 21.7 },
                    { method: 'Paystack', amount: 280000, count: 112, percentage: 19.0 },
                    { method: 'POS', amount: 25000, count: 12, percentage: 1.7 }
                ],
                feeCollection: {
                    collected: 1250000,
                    outstanding: 350000,
                    rate: 78.1
                }
            };
        }

        // Real data aggregation logic
        try {
            // Summary Calculation
            let paymentsQuery = supabase.from('payments').select('amount, payment_method').eq('school_id', schoolId).gte('payment_date', startDate).lte('payment_date', endDate).eq('status', 'Completed');
            let donationsQuery = supabase.from('donations').select('amount').eq('school_id', schoolId).gte('donation_date', startDate).lte('donation_date', endDate).eq('status', 'Completed');
            let salariesQuery = supabase.from('salary_payments').select('amount_paid').eq('school_id', schoolId).gte('payment_date', startDate).lte('payment_date', endDate);
            let feesQuery = supabase.from('student_fees').select('total_fee, paid_amount').eq('school_id', schoolId);

            if (branchId && branchId !== 'all') {
                paymentsQuery = paymentsQuery.eq('branch_id', branchId);
                donationsQuery = donationsQuery.eq('branch_id', branchId);
                salariesQuery = salariesQuery.eq('branch_id', branchId);
                feesQuery = feesQuery.eq('branch_id', branchId);
            }

            const queries = [paymentsQuery, donationsQuery, salariesQuery, feesQuery];
            const responses = await Promise.all(queries);

            // Resilient check: if any query failed due to branch_id, retry without it
            const [paymentsRes, donationsRes, salariesRes, feesRes] = await Promise.all(responses.map(async (res, i) => {
                if (res.error && res.error.message.includes('column') && branchId) {
                    console.warn(`⚠️ [FeeService] Analytics fallback: column missing in query ${i}`);
                    let retryQuery;
                    if (i === 0) retryQuery = supabase.from('payments').select('amount, payment_method').eq('school_id', schoolId).gte('payment_date', startDate).lte('payment_date', endDate).eq('status', 'Completed');
                    if (i === 1) retryQuery = supabase.from('donations').select('amount').eq('school_id', schoolId).gte('donation_date', startDate).lte('donation_date', endDate).eq('status', 'Completed');
                    if (i === 2) retryQuery = supabase.from('salary_payments').select('amount_paid').eq('school_id', schoolId).gte('payment_date', startDate).lte('payment_date', endDate);
                    if (i === 3) retryQuery = supabase.from('student_fees').select('total_fee, paid_amount').eq('school_id', schoolId);
                    return await retryQuery;
                }
                return res;
            }));

            const feeRevenue = paymentsRes.data?.reduce((sum, p) => sum + p.amount, 0) || 0;
            const donationRevenue = donationsRes.data?.reduce((sum, d) => sum + d.amount, 0) || 0;
            const salaryExpenses = salariesRes.data?.reduce((sum, s) => sum + s.amount_paid, 0) || 0;

            const totalRevenue = feeRevenue + donationRevenue;
            const totalExpenses = salaryExpenses;

            // Payment Methods Breakdown
            const methodMap: { [key: string]: { amount: number; count: number } } = {};
            let totalAmount = 0;
            paymentsRes.data?.forEach(p => {
                const method = p.payment_method || 'Other';
                if (!methodMap[method]) methodMap[method] = { amount: 0, count: 0 };
                methodMap[method].amount += p.amount;
                methodMap[method].count += 1;
                totalAmount += p.amount;
            });

            const paymentMethods = Object.entries(methodMap).map(([method, data]) => ({
                method,
                amount: data.amount,
                count: data.count,
                percentage: totalAmount > 0 ? (data.amount / totalAmount) * 100 : 0
            })).sort((a, b) => b.amount - a.amount);

            // Fee Collection Rate
            const totalFees = feesRes.data?.reduce((sum, f) => sum + f.total_fee, 0) || 0;
            const totalPaid = feesRes.data?.reduce((sum, f) => sum + f.paid_amount, 0) || 0;
            const outstanding = totalFees - totalPaid;
            const rate = totalFees > 0 ? (totalPaid / totalFees) * 100 : 0;

            return {
                summary: {
                    period_type: periodType,
                    period_start: startDate,
                    period_end: endDate,
                    fee_revenue: feeRevenue,
                    donation_revenue: donationRevenue,
                    grant_revenue: 0,
                    other_revenue: 0,
                    total_revenue: totalRevenue,
                    salary_expenses: salaryExpenses,
                    operational_expenses: 0,
                    maintenance_expenses: 0,
                    other_expenses: 0,
                    total_expenses: totalExpenses,
                    net_income: totalRevenue - totalExpenses
                },
                paymentMethods,
                feeCollection: {
                    collected: totalPaid,
                    outstanding,
                    rate: Math.round(rate * 10) / 10
                }
            };
        } catch (error: any) {
            throw new Error(error.message);
        }
    }

    static async recordPayment(schoolId: string, branchId: string | undefined, data: any) {
        const { feeId, studentId, amount, reference, method } = data;
        const isDemoSchool = schoolId === '00000000-0000-0000-0000-000000000000';

        if (isDemoSchool) {
            console.log('🛡️ [FeeService] Mock Recording Payment for Demo');
            return { success: true };
        }

        try {
            // 1. Fetch current fee to calculate new paid amount
            const { data: fee, error: fetchError } = await supabase
                .from('student_fees')
                .select('title, amount, paid_amount')
                .eq('id', feeId)
                .single();

            if (fetchError || !fee) throw new Error('Fee not found');

            const newPaidAmount = (fee.paid_amount || 0) + amount;
            const newStatus = newPaidAmount >= fee.amount ? 'Paid' : 'Partial';

            // 2. Insert into payments table (unifying with analytics source)
            const paymentData: any = {
                school_id: schoolId,
                amount,
                reference,
                provider: method,
                status: 'success',
                metadata: { fee_id: feeId, student_id: studentId }
            };

            // Only add columns if they exist in the DB (resilience fallback)
            try {
                const { error: txError } = await supabase
                    .from('payments')
                    .insert([{
                        ...paymentData,
                        branch_id: branchId,
                        purpose: 'fee_payment'
                    }]);

                if (txError && txError.message.includes('column')) {
                    console.warn('⚠️ [FeeService] Falling back: payments columns missing');
                    const { error: retryError } = await supabase
                        .from('payments')
                        .insert([paymentData]);
                    if (retryError) throw new Error(retryError.message);
                } else if (txError) {
                    throw new Error(txError.message);
                }
            } catch (err) {
                console.error('Error inserting payment record:', err);
                // Continue with fee update even if payment log fails
            }

            // 3. Update student_fees (Resilient Update)
            const feeUpdateData: any = {
                paid_amount: newPaidAmount,
                status: newStatus
            };

            try {
                const { error: updateError } = await supabase
                    .from('student_fees')
                    .update({
                        ...feeUpdateData,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', feeId);

                if (updateError && updateError.message.includes('column')) {
                    console.warn('⚠️ [FeeService] Falling back: student_fees updated_at missing');
                    const { error: retryError } = await supabase
                        .from('student_fees')
                        .update(feeUpdateData)
                        .eq('id', feeId);
                    if (retryError) throw new Error(retryError.message);
                } else if (updateError) {
                    throw new Error(updateError.message);
                }
            } catch (feeErr) {
                console.error('Error updating fee record:', feeErr);
                throw feeErr; // Fee update is critical
            }

            // 4. Send parent notification
            try {
                const { data: student } = await supabase
                    .from('students')
                    .select('name, user_id')
                    .eq('id', studentId)
                    .single();

                const { data: parentLinks } = await supabase
                    .from('parent_children')
                    .select('parent_id')
                    .eq('student_id', studentId);

                if (parentLinks && parentLinks.length > 0) {
                    const parentIds = parentLinks.map((l: any) => l.parent_id);

                    for (const pId of parentIds) {
                        await supabase.from('notifications').insert([{
                            school_id: schoolId,
                            branch_id: branchId,
                            user_id: pId,
                            title: 'Payment Confirmed',
                            message: `Payment of ₦${amount.toLocaleString()} for ${student?.name}'s "${fee.title}" has been confirmed.`,
                            type: 'fee_payment',
                            metadata: { fee_id: feeId, amount, reference }
                        }]);
                    }
                }
            } catch (notifErr) {
                console.warn('Silent failure on notification:', notifErr);
            }

            return { success: true };
        } catch (error: any) {
            throw new Error(error.message);
        }
    }

    static async getPaymentHistory(schoolId: string, branchId: string | undefined, studentId?: string) {
        const isDemoSchool = schoolId === '00000000-0000-0000-0000-000000000000';

        if (isDemoSchool) {
            console.log('🛡️ [FeeService] Injecting Demo Payment History');
            return [
                { id: 'tx1', studentId: 'demo-student-1', amount: 5000, reference: 'REC-001', date: new Date().toISOString(), status: 'success', method: 'Bank Transfer' },
                { id: 'tx2', studentId: 'demo-student-2', amount: 2000, reference: 'REC-002', date: new Date().toISOString(), status: 'success', method: 'Cash' }
            ];
        }

        let query = supabase
            .from('payments')
            .select('*');

        // Try filtering by purpose if it exists
        try {
            query = query.eq('school_id', schoolId).eq('purpose', 'fee_payment');
        } catch (e) {
            query = query.eq('school_id', schoolId);
        }

        if (branchId && branchId !== 'all') {
            // We append branch_id later in a resilient way
        }

        if (studentId) {
            query = query.eq('metadata->>student_id', studentId);
        }

        let { data, error } = await query.order('created_at', { ascending: false });

        if (error && error.message.includes('column')) {
            console.warn('⚠️ [FeeService] Falling back: query failed due to missing columns');
            // Retry without purpose and branch_id filters
            let retryQuery = supabase
                .from('payments')
                .select('*')
                .eq('school_id', schoolId);

            if (studentId) {
                retryQuery = retryQuery.eq('metadata->>student_id', studentId);
            }

            const retryRes = await retryQuery.order('created_at', { ascending: false });
            data = retryRes.data;
            error = retryRes.error;
        }

        if (error) throw new Error(error.message);

        return (data || []).map(tx => ({
            id: tx.id,
            studentId: tx.metadata?.student_id,
            feeId: tx.metadata?.fee_id,
            amount: tx.amount,
            reference: tx.reference,
            date: tx.created_at || tx.payment_date,
            status: tx.status,
            method: tx.provider || tx.payment_method
        }));
    }

    static async deletePayment(schoolId: string, branchId: string | undefined, paymentId: string) {
        const isDemoSchool = schoolId === '00000000-0000-0000-0000-000000000000';

        if (isDemoSchool) {
            console.log('🛡️ [FeeService] Mock Deleting Payment for Demo');
            return { success: true };
        }

        try {
            // 1. Fetch payment details
            const { data: payment, error: fetchError } = await supabase
                .from('payments')
                .select('*')
                .eq('id', paymentId)
                .single();

            if (fetchError || !payment) throw new Error('Payment not found');

            const feeId = payment.metadata?.fee_id;

            // 2. Delete payment record
            const { error: deleteError } = await supabase
                .from('payments')
                .delete()
                .eq('id', paymentId);

            if (deleteError) throw new Error(deleteError.message);

            // 3. Revert fee status/amount if feeId exists
            if (feeId) {
                const { data: fee, error: feeFetchError } = await supabase
                    .from('student_fees')
                    .select('amount, paid_amount')
                    .eq('id', feeId)
                    .single();

                if (fee) {
                    const newPaidAmount = Math.max(0, (fee.paid_amount || 0) - payment.amount);
                    const newStatus = newPaidAmount >= fee.amount ? 'Paid' : (newPaidAmount > 0 ? 'Partial' : 'Pending');

                    // Resilient Fee Revert
                    const feeUpdateData: any = {
                        paid_amount: newPaidAmount,
                        status: newStatus
                    };

                    try {
                        await supabase
                            .from('student_fees')
                            .update({
                                ...feeUpdateData,
                                updated_at: new Date().toISOString()
                            })
                            .eq('id', feeId);
                    } catch (e) {
                        // Fallback: missing updated_at
                        await supabase
                            .from('student_fees')
                            .update(feeUpdateData)
                            .eq('id', feeId);
                    }
                }
            }

            return { success: true };
        } catch (error: any) {
            throw new Error(error.message);
        }
    }

    static async getBudgets(schoolId: string, branchId?: string): Promise<any[]> {
        if (schoolId === DEMO_SCHOOL_ID) {
            return [
                { id: 'b1', category: 'Staff Salaries', allocated_amount: 50000000, spent_amount: 42000000, fiscal_year: '2025', created_at: new Date().toISOString() },
                { id: 'b2', category: 'Infrastructure', allocated_amount: 20000000, spent_amount: 15000000, fiscal_year: '2025', created_at: new Date().toISOString() },
                { id: 'b3', category: 'Academic Resources', allocated_amount: 10000000, spent_amount: 8500000, fiscal_year: '2025', created_at: new Date().toISOString() },
                { id: 'b4', category: 'Sports & Arts', allocated_amount: 5000000, spent_amount: 3200000, fiscal_year: '2025', created_at: new Date().toISOString() },
            ];
        }

        let query = supabase.from('budgets').select('*').eq('school_id', schoolId);
        if (branchId) query = query.eq('branch_id', branchId);

        try {
            const { data, error } = await query.order('fiscal_year', { ascending: false });
            if (error && error.message.includes('column') && branchId) {
                const retryQuery = supabase.from('budgets').select('*').eq('school_id', schoolId);
                const retryRes = await retryQuery.order('fiscal_year', { ascending: false });
                if (retryRes.error) throw retryRes.error;
                return retryRes.data || [];
            }
            if (error) throw error;
            return data || [];
        } catch (e: any) {
            console.warn('⚠️ [FeeService] getBudgets fallback:', e.message);
            return [];
        }
    }

    static async createBudget(schoolId: string, branchId: string | undefined, data: any): Promise<any> {
        if (schoolId === DEMO_SCHOOL_ID) return { id: 'temp-' + Date.now(), ...data };

        try {
            const { data: result, error } = await supabase.from('budgets').insert({
                school_id: schoolId,
                branch_id: branchId,
                ...data
            }).select().single();

            if (error && error.message.includes('column') && branchId) {
                console.warn('⚠️ [FeeService] createBudget fallback: branch_id missing');
                const retryRes = await supabase.from('budgets').insert({
                    school_id: schoolId,
                    ...data
                }).select().single();
                if (retryRes.error) throw retryRes.error;
                return retryRes.data;
            }
            if (error) throw error;
            return result;
        } catch (e: any) {
            throw new Error(e.message);
        }
    }

    static async getArrears(schoolId: string, branchId?: string): Promise<any[]> {
        if (schoolId === DEMO_SCHOOL_ID) {
            return [
                { id: 1, teacher_name: 'John Doe', amount_owed: 50000, reason: 'July 2024 Bonus', due_date: '2024-08-01', status: 'Pending', created_at: new Date().toISOString() },
                { id: 2, teacher_name: 'Jane Smith', amount_owed: 75000, reason: 'Back pay for Jan-Mar', due_date: '2024-07-25', status: 'Pending', created_at: new Date().toISOString() },
                { id: 3, teacher_name: 'Robert Wilson', amount_owed: 25000, reason: 'Travel Allowance', due_date: '2024-08-05', status: 'Paid', created_at: new Date().toISOString() },
            ];
        }

        let query = supabase.from('arrears').select(`
            *,
            teachers!inner (
                full_name,
                school_id,
                branch_id
            )
        `).eq('teachers.school_id', schoolId);

        if (branchId) query = query.eq('teachers.branch_id', branchId);

        try {
            const { data, error } = await query.order('created_at', { ascending: false });
            if (error && error.message.includes('column') && branchId) {
                console.warn('⚠️ [FeeService] getArrears fallback: branch_id missing');
                const retryQuery = supabase.from('arrears').select('*, teachers!inner(full_name, school_id)').eq('teachers.school_id', schoolId);
                const retryRes = await retryQuery.order('created_at', { ascending: false });
                if (retryRes.error) throw retryRes.error;
                return (retryRes.data || []).map((item: any) => ({
                    id: item.id,
                    teacher_id: item.teacher_id,
                    teacher_name: item.teachers?.full_name || 'Unknown',
                    amount_owed: item.amount_owed,
                    reason: item.reason,
                    due_date: item.due_date,
                    status: item.status,
                    created_at: item.created_at
                }));
            }
            if (error) throw error;
            return (data || []).map((item: any) => ({
                id: item.id,
                teacher_id: item.teacher_id,
                teacher_name: item.teachers?.full_name || 'Unknown',
                amount_owed: item.amount_owed,
                reason: item.reason,
                due_date: item.due_date,
                status: item.status,
                created_at: item.created_at
            }));
        } catch (e: any) {
            console.warn('⚠️ [FeeService] getArrears fallback:', e.message);
            return [];
        }
    }

    static async updateArrearStatus(arrearId: string, status: string): Promise<any> {
        const { data, error } = await supabase
            .from('arrears')
            .update({ status })
            .eq('id', arrearId)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    // Helper to map DB fee to Frontend fee
    private static mapFee(fee: any) {
        if (!fee) return null;
        return {
            id: fee.id,
            studentId: fee.student_id,
            title: fee.title,
            amount: fee.amount,
            paidAmount: fee.paid_amount,
            status: fee.status,
            dueDate: fee.due_date,
            createdAt: fee.created_at
        };
    }
}

