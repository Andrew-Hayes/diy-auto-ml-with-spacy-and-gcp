export const epoch_to_local = (epoch) => {
    let d = new Date(0);
    d.setUTCSeconds(epoch);
    return d.toLocaleDateString() + " " + d.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})
  };