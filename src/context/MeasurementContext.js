import React, { createContext, useContext, useReducer } from 'react';

const MeasurementContext = createContext();

const initialState = {
  isRecording: false,
  sensorBuffer: [],       // buffer accelerometer hien tai
  locationHistory: [],     // lich su GPS [{lat, lon, speed, altitude, timestamp}]
  segmentResults: [],      // ket qua WRMS [{wrms, comfort, color, lat, lon, speed}]
  currentAccel: { x: 0, y: 0, z: 0 },
  currentLocation: null,
  currentWRMS: 0,
  currentComfort: '',
  startTime: null,
  sampleCount: 0,
  // Du lieu cho bieu do
  speedHistory: [],        // [{value, timestamp}]
  altitudeHistory: [],
  accelHistory: [],
  wrmsHistory: [],
};

function reducer(state, action) {
  switch (action.type) {
    case 'START_RECORDING':
      return {
        ...initialState,
        isRecording: true,
        startTime: Date.now(),
      };
    case 'STOP_RECORDING':
      return { ...state, isRecording: false };
    case 'UPDATE_ACCEL':
      return {
        ...state,
        currentAccel: action.payload,
        sampleCount: state.sampleCount + 1,
      };
    case 'ADD_TO_BUFFER':
      return {
        ...state,
        sensorBuffer: [...state.sensorBuffer, action.payload],
      };
    case 'CLEAR_BUFFER':
      return { ...state, sensorBuffer: [] };
    case 'UPDATE_LOCATION':
      return {
        ...state,
        currentLocation: action.payload,
        locationHistory: [...state.locationHistory, action.payload],
        speedHistory: [
          ...state.speedHistory.slice(-300),
          { value: (action.payload.speed || 0) * 3.6, timestamp: Date.now() },
        ],
        altitudeHistory: [
          ...state.altitudeHistory.slice(-300),
          { value: action.payload.altitude || 0, timestamp: Date.now() },
        ],
      };
    case 'ADD_SEGMENT_RESULT':
      return {
        ...state,
        segmentResults: [...state.segmentResults, action.payload],
        currentWRMS: action.payload.wrms,
        currentComfort: action.payload.comfort,
        wrmsHistory: [
          ...state.wrmsHistory.slice(-300),
          { value: action.payload.wrms, timestamp: Date.now() },
        ],
      };
    case 'ADD_ACCEL_HISTORY':
      return {
        ...state,
        accelHistory: [
          ...state.accelHistory.slice(-300),
          action.payload,
        ],
      };
    case 'SET_FULL_ANALYSIS':
      return { ...state, fullAnalysis: action.payload };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}

export function MeasurementProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  return (
    <MeasurementContext.Provider value={{ state, dispatch }}>
      {children}
    </MeasurementContext.Provider>
  );
}

export function useMeasurementContext() {
  const context = useContext(MeasurementContext);
  if (!context) {
    throw new Error('useMeasurementContext must be used within MeasurementProvider');
  }
  return context;
}
