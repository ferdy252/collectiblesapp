// Get icon name based on notification type
export const getIconForType = (type) => {
  switch (type) {
    case 'success':
      return 'checkmark-circle';
    case 'warning':
      return 'warning';
    case 'error':
      return 'alert-circle';
    case 'info':
    default:
      return 'information-circle';
  }
};

// Get color based on notification type
export const getColorForType = (type, theme) => {
  switch (type) {
    case 'success':
      return theme.colors.success || '#4CAF50';
    case 'warning':
      return theme.colors.warning || '#FF9800';
    case 'error':
      return theme.colors.error || '#F44336';
    case 'info':
    default:
      return theme.colors.info || '#2196F3';
  }
};
