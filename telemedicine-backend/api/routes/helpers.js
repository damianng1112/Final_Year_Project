const generateTimeSlots = (startTime, endTime, slotDuration) => {
  const slots = [];
  
  try {
    // Validate inputs
    if (!startTime || !endTime || !slotDuration) {
      console.error("Missing required parameters for generateTimeSlots");
      return slots;
    }
    
    // Convert to numbers for validation
    const slotDurationNum = parseInt(slotDuration, 10);
    
    if (isNaN(slotDurationNum) || slotDurationNum <= 0) {
      console.error("Invalid slot duration:", slotDuration);
      return slots;
    }
    
    // Create a base date to work with time calculations
    let start = new Date(`2022-01-01T${startTime}:00`);
    let end = new Date(`2022-01-01T${endTime}:00`);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      console.error("Invalid time format:", { startTime, endTime });
      return slots;
    }
    
    if (end <= start) {
      console.error("End time must be after start time");
      return slots;
    }

    while (start < end) {
      let slotStart = start.toTimeString().split(" ")[0].substring(0, 5); // HH:MM format
      start.setMinutes(start.getMinutes() + slotDurationNum);
      let slotEnd = start.toTimeString().split(" ")[0].substring(0, 5);
      
      if (start <= end) {
        slots.push(`${slotStart} - ${slotEnd}`);
      }
    }
    
    return slots;
  } catch (error) {
    console.error("Error generating time slots:", error);
    return slots;
  }
};

module.exports = { generateTimeSlots };