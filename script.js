// ===========================
// DATA & STATE
// ===========================
const days = [
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday'
];

// Store timesheet data
let timesheetData = days.map(day => ({
    name: day,
    startHour: '',
    startMin: '',
    startPeriod: 'AM',
    endHour: '',
    endMin: '',
    endPeriod: 'PM',
    breakMinutes: 0,
    totalHours: 0
}));

// ===========================
// INITIALIZATION
// ===========================
function init() {
    renderTimesheet();
    loadFromLocalStorage();
    updateAllTotals();
}

// ===========================
// RENDERING
// ===========================
function renderTimesheet() {
    const timesheetContainer = document.getElementById('timesheet');

    timesheetData.forEach((day, index) => {
        const dayCard = createDayCard(day, index);
        timesheetContainer.appendChild(dayCard);
    });
}

function createDayCard(day, index) {
    const card = document.createElement('div');
    card.className = 'day-card';
    card.innerHTML = `
        <div class="day-header">
            <h2 class="day-name">${day.name}</h2>
            <div class="day-total" data-day="${index}">0:00</div>
        </div>
        <div class="day-inputs">
            <div class="input-group">
                <label class="input-label" for="start-hour-${index}">Start Time</label>
                <div class="time-picker">
                    <input
                        type="number"
                        id="start-hour-${index}"
                        class="time-hour-input"
                        data-day="${index}"
                        data-field="startHour"
                        min="1"
                        max="12"
                        placeholder="9"
                    >
                    <span class="time-separator">:</span>
                    <input
                        type="number"
                        id="start-min-${index}"
                        class="time-min-input"
                        data-day="${index}"
                        data-field="startMin"
                        min="0"
                        max="59"
                        placeholder="00"
                    >
                    <select
                        id="start-period-${index}"
                        class="time-period-select"
                        data-day="${index}"
                        data-field="startPeriod"
                    >
                        <option value="AM">AM</option>
                        <option value="PM">PM</option>
                    </select>
                </div>
            </div>
            <div class="input-group">
                <label class="input-label" for="end-hour-${index}">End Time</label>
                <div class="time-picker">
                    <input
                        type="number"
                        id="end-hour-${index}"
                        class="time-hour-input"
                        data-day="${index}"
                        data-field="endHour"
                        min="1"
                        max="12"
                        placeholder="5"
                    >
                    <span class="time-separator">:</span>
                    <input
                        type="number"
                        id="end-min-${index}"
                        class="time-min-input"
                        data-day="${index}"
                        data-field="endMin"
                        min="0"
                        max="59"
                        placeholder="00"
                    >
                    <select
                        id="end-period-${index}"
                        class="time-period-select"
                        data-day="${index}"
                        data-field="endPeriod"
                    >
                        <option value="AM">AM</option>
                        <option value="PM">PM</option>
                    </select>
                </div>
            </div>
            <div class="input-group">
                <label class="input-label" for="break-${index}">Break (min)</label>
                <div class="input-wrapper">
                    <input
                        type="number"
                        id="break-${index}"
                        class="break-input"
                        data-day="${index}"
                        data-field="breakMinutes"
                        min="0"
                        max="480"
                        value="0"
                        placeholder="0"
                    >
                </div>
            </div>
        </div>
    `;

    // Add event listeners
    const inputs = card.querySelectorAll('input');
    inputs.forEach(input => {
        input.addEventListener('change', handleInputChange);
        input.addEventListener('input', handleInputChange);
    });

    return card;
}

// ===========================
// EVENT HANDLERS
// ===========================
function handleInputChange(event) {
    const dayIndex = parseInt(event.target.dataset.day);
    const field = event.target.dataset.field;
    let value = event.target.value;

    // Update data
    if (field === 'breakMinutes') {
        timesheetData[dayIndex][field] = parseInt(value) || 0;
    } else if (field === 'startHour' || field === 'endHour') {
        // Validate hour (1-12)
        let hour = parseInt(value);
        if (hour < 1) hour = 1;
        if (hour > 12) hour = 12;
        timesheetData[dayIndex][field] = hour || '';
        event.target.value = hour || '';
    } else if (field === 'startMin' || field === 'endMin') {
        // Validate minutes (0-59) and pad with zero
        let min = parseInt(value);
        if (min < 0) min = 0;
        if (min > 59) min = 59;
        timesheetData[dayIndex][field] = min || '';
        if (min >= 0 && min <= 9 && value.length === 1) {
            event.target.value = '0' + min;
        }
    } else {
        timesheetData[dayIndex][field] = value;
    }

    // Recalculate and update UI
    updateDayTotal(dayIndex);
    updateWeeklyTotal();
    saveToLocalStorage();
}

// ===========================
// CALCULATIONS
// ===========================
function convertTo24Hour(hour, minute, period) {
    let hour24 = parseInt(hour);
    const min = parseInt(minute) || 0;

    if (!hour24) return null;

    // Convert to 24-hour format
    if (period === 'AM') {
        if (hour24 === 12) hour24 = 0; // 12 AM = 0:00
    } else { // PM
        if (hour24 !== 12) hour24 += 12; // Add 12 except for 12 PM
    }

    return hour24 * 60 + min; // Return total minutes
}

function calculateDayHours(dayData) {
    const { startHour, startMin, startPeriod, endHour, endMin, endPeriod, breakMinutes } = dayData;

    // Return 0 if times aren't set
    if (!startHour || !endHour) {
        return 0;
    }

    // Convert to minutes since midnight
    const startMinutes = convertTo24Hour(startHour, startMin, startPeriod);
    const endMinutes = convertTo24Hour(endHour, endMin, endPeriod);

    if (startMinutes === null || endMinutes === null) {
        return 0;
    }

    // Calculate work minutes
    let workMinutes = endMinutes - startMinutes;

    // Handle overnight shifts
    if (workMinutes < 0) {
        workMinutes += 24 * 60; // Add 24 hours
    }

    // Subtract break
    workMinutes -= (breakMinutes || 0);

    // Ensure non-negative
    workMinutes = Math.max(0, workMinutes);

    // Convert to hours (decimal)
    return workMinutes / 60;
}

function formatHours(decimalHours) {
    const hours = Math.floor(decimalHours);
    const minutes = Math.round((decimalHours - hours) * 60);
    return `${hours}:${minutes.toString().padStart(2, '0')}`;
}

// ===========================
// UI UPDATES
// ===========================
function updateDayTotal(dayIndex) {
    const dayData = timesheetData[dayIndex];
    const totalHours = calculateDayHours(dayData);
    dayData.totalHours = totalHours;

    const totalElement = document.querySelector(`[data-day="${dayIndex}"].day-total`);
    if (totalElement) {
        totalElement.textContent = formatHours(totalHours);
        totalElement.classList.add('pulse');
        setTimeout(() => totalElement.classList.remove('pulse'), 300);
    }
}

function updateWeeklyTotal() {
    const totalHours = timesheetData.reduce((sum, day) => sum + day.totalHours, 0);
    const weeklyTotalElement = document.getElementById('weeklyTotal');

    if (weeklyTotalElement) {
        weeklyTotalElement.textContent = formatHours(totalHours);
        weeklyTotalElement.classList.add('pulse');
        setTimeout(() => weeklyTotalElement.classList.remove('pulse'), 300);
    }
}

function updateAllTotals() {
    timesheetData.forEach((_, index) => updateDayTotal(index));
    updateWeeklyTotal();
}

// ===========================
// LOCAL STORAGE
// ===========================
function saveToLocalStorage() {
    try {
        localStorage.setItem('timesheetData', JSON.stringify(timesheetData));
    } catch (error) {
        console.error('Failed to save to localStorage:', error);
    }
}

function loadFromLocalStorage() {
    try {
        const saved = localStorage.getItem('timesheetData');
        if (saved) {
            const parsedData = JSON.parse(saved);

            // Merge saved data with current structure
            timesheetData.forEach((day, index) => {
                if (parsedData[index]) {
                    day.startHour = parsedData[index].startHour || '';
                    day.startMin = parsedData[index].startMin || '';
                    day.startPeriod = parsedData[index].startPeriod || 'AM';
                    day.endHour = parsedData[index].endHour || '';
                    day.endMin = parsedData[index].endMin || '';
                    day.endPeriod = parsedData[index].endPeriod || 'PM';
                    day.breakMinutes = parsedData[index].breakMinutes || 0;
                }
            });

            // Update UI with loaded values
            timesheetData.forEach((day, index) => {
                const startHourInput = document.getElementById(`start-hour-${index}`);
                const startMinInput = document.getElementById(`start-min-${index}`);
                const startPeriodInput = document.getElementById(`start-period-${index}`);
                const endHourInput = document.getElementById(`end-hour-${index}`);
                const endMinInput = document.getElementById(`end-min-${index}`);
                const endPeriodInput = document.getElementById(`end-period-${index}`);
                const breakInput = document.getElementById(`break-${index}`);

                if (startHourInput) startHourInput.value = day.startHour;
                if (startMinInput) startMinInput.value = day.startMin;
                if (startPeriodInput) startPeriodInput.value = day.startPeriod;
                if (endHourInput) endHourInput.value = day.endHour;
                if (endMinInput) endMinInput.value = day.endMin;
                if (endPeriodInput) endPeriodInput.value = day.endPeriod;
                if (breakInput) breakInput.value = day.breakMinutes || 0;
            });
        }
    } catch (error) {
        console.error('Failed to load from localStorage:', error);
    }
}

// ===========================
// INITIALIZATION
// ===========================
document.addEventListener('DOMContentLoaded', init);
