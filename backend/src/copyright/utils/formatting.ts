export const formatDate = (date) => {
    return new Date(date).toLocaleDateString();
  };
  
export function formatCopyrightResponse(data: any): any {
  return {
      id: data.id,
      title: data.title,
      owner: data.owner,
  };
}
