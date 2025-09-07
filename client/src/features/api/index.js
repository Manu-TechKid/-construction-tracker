// Re-export all API slices from a central location
export { useGetBuildingsQuery } from '../buildings/buildingsApiSlice';
export { useGetUsersQuery, useGetWorkersQuery } from '../users/usersApiSlice';
export { 
  useGetWorkOrdersQuery,
  useGetWorkOrderQuery,
  useCreateWorkOrderMutation,
  useUpdateWorkOrderMutation,
  useDeleteWorkOrderMutation
} from '../workOrders/workOrdersApiSlice';
