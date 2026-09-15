import React, { createContext, useContext, useReducer } from 'react';

const MeasurementContext = createContext();

const initialState = {
  isRecording: false,
  locationHistory: [],     // lich su GPS [{lat, lon, speed, altitude, timestamp}]
  // ket qua WRMS [{wrms, aw_z, aw_xy, fs, duration, comfort, color, lat, lon, speed, timestamp, source}]
  // lat/lon = null khi khong co GPS fix; speed = m/s trung binh trong segment; source = 'backend' | 'client'
  segmentResults: [],
  fullAnalysis: null,
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
        currentAccel: action.payload.accel,
        sampleCount: action.payload.sampleCount,
      };
    case 'UPDATE_LOCATION':
      return {
        ...state,
        currentLocation: action.payload,
        locationHistory: [...state.locationHistory, action.payload],
        speedHistory: [
          ...state.speedHistory.slice(-300),
          { value: Math.max(0, (action.payload.speed || 0)) * 3.6, timestamp: Date.now() },
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
