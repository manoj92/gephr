import { configureStore } from '@reduxjs/toolkit';
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import userReducer from './slices/userSlice';
import recordingReducer from './slices/recordingSlice';
import robotReducer from './slices/robotSlice';
import marketplaceReducer from './slices/marketplaceSlice';
import mappingReducer from './slices/mappingSlice';
import settingsReducer from './slices/settingsSlice';

export const store = configureStore({
  reducer: {
    user: userReducer,
    recording: recordingReducer,
    robot: robotReducer,
    marketplace: marketplaceReducer,
    mapping: mappingReducer,
    settings: settingsReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['recording/startRecording', 'recording/stopRecording'],
        ignoredPaths: ['recording.currentFrame', 'mapping.pointCloud'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;