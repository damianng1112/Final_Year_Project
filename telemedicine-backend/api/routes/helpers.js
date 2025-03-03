const generateTimeSlots = (startTime, endTime, slotDuration) => {
    const slots = [];
    let start = new Date(`2022-01-01T${startTime}:00`);
    let end = new Date(`2022-01-01T${endTime}:00`);
  
    while (start < end) {
      let slotStart = start.toTimeString().split(" ")[0].substring(0, 5); // HH:MM format
      start.setMinutes(start.getMinutes() + slotDuration);
      let slotEnd = start.toTimeString().split(" ")[0].substring(0, 5);
      if (start <= end) {
        slots.push(`${slotStart} - ${slotEnd}`);
      }
    }
    return slots;
  };
  
  module.exports = { generateTimeSlots };
  