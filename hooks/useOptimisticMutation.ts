import { useMutation, useQueryClient, QueryKey } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';

interface OptimisticOptions<TData, TVariables, TContext> {
  queryKey: QueryKey;
  mutationFn: (variables: TVariables) => Promise<TData>;
  onSuccessMessage?: string;
  errorMessage?: string;
  // Function to determine how to update the cache
  updateFn: (oldData: any, newVariables: TVariables) => any;
}

export function useOptimisticMutation<TData, TVariables, TContext = any>({
  queryKey,
  mutationFn,
  onSuccessMessage,
  errorMessage,
  updateFn,
}: OptimisticOptions<TData, TVariables, TContext>) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onMutate: async (newVariables: TVariables) => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey });

      // Snapshot the previous value
      const previousData = queryClient.getQueryData(queryKey);

      // Optimistically update to the new value
      queryClient.setQueryData(queryKey, (old: any) => updateFn(old, newVariables));

      // Return a context object with the snapshotted value
      return { previousData };
    },
    onError: (err, newVariables, context) => {
      // Rollback to the previous value if mutation fails
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData);
      }
      toast.error(errorMessage || 'Operation failed');
      console.error('Mutation error:', err);
    },
    onSuccess: () => {
      if (onSuccessMessage) {
        toast.success(onSuccessMessage);
      }
    },
    onSettled: () => {
      // Always refetch after error or success to ensure we're in sync with the server
      queryClient.invalidateQueries({ queryKey });
    },
  });
}
