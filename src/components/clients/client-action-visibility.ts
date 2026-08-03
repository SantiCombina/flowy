export function resolveClientActionVisibility(canEdit: boolean, canDelete: boolean) {
  return {
    showActions: canEdit || canDelete,
    showEdit: canEdit,
    showDelete: canDelete,
  };
}
