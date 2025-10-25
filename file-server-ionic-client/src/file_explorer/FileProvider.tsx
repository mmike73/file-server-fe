import React, { useCallback, useContext, useEffect, useReducer } from 'react';
import PropTypes from 'prop-types';
import { useAuth } from '../auth/AuthProvider';
import { createFile, getFiles, getPrivateFiles } from './FileApi';
import { all } from 'axios';

export type FileProps = {
  id: string,
  file?: File,
  fileName: string,
  size: number,
  contentType: string,
  visibility: boolean,
}

type SaveFileFn = (item: FileProps) => Promise<any>;

export interface FileState {
  files?: FileProps[],
  fetching: boolean,
  fetchingError?: Error | null,
  saving: boolean,
  savingError?: Error | null,
  saveItem?: SaveFileFn,
}

interface ActionProps {
  type: string,
  payload?: any,
}

const initialState: FileState = {
  fetching: false,
  saving: false,
};

const FETCH_ITEMS_STARTED = 'FETCH_ITEMS_STARTED';
const FETCH_ITEMS_SUCCEEDED = 'FETCH_ITEMS_SUCCEEDED';
const FETCH_ITEMS_FAILED = 'FETCH_ITEMS_FAILED';
const SAVE_ITEM_STARTED = 'SAVE_ITEM_STARTED';
const SAVE_ITEM_SUCCEEDED = 'SAVE_ITEM_SUCCEEDED';
const SAVE_ITEM_FAILED = 'SAVE_ITEM_FAILED';

const reducer: (state: FileState, action: ActionProps) => FileState =
  (state, { type, payload }) => {
    switch (type) {
      case FETCH_ITEMS_STARTED:
        return { ...state, fetching: true, fetchingError: null };
      case FETCH_ITEMS_SUCCEEDED:
        return { ...state, files: payload.items, fetching: false };
      case FETCH_ITEMS_FAILED:
        return { ...state, fetchingError: payload.error, fetching: false };
      case SAVE_ITEM_STARTED:
        return { ...state, savingError: null, saving: true };
      case SAVE_ITEM_SUCCEEDED:
        const files = [...(state.files || [])];
        const item = payload.item;
        const index = files.findIndex(it => it.id === item._id);
        if (index === -1) {
          files.splice(0, 0, item);
        } else {
          files[index] = item;
        }
        return { ...state, files, saving: false };
      case SAVE_ITEM_FAILED:
        return { ...state, savingError: payload.error, saving: false };
      default:
        return state;
    }
  };

export const FileContext = React.createContext<FileState>(initialState);

interface ItemProviderProps {
  children: React.ReactNode,
}

export const ItemProvider: React.FC<ItemProviderProps> = ({ children }) => {
  const { accessToken } = useAuth();
  const [state, dispatch] = useReducer(reducer, initialState);
  const { files, fetching, fetchingError, saving, savingError } = state;
  useEffect(getItemsEffect, [accessToken]);
  const saveItem = useCallback<SaveFileFn>(saveItemCallback, [accessToken]);
  const value = { files, fetching, fetchingError, saving, savingError, saveItem };
  return (
    <FileContext.Provider value={value}>
      {children}
    </FileContext.Provider>
  );

  function getItemsEffect() {
    let canceled = false;
    if (accessToken) {
      fetchItems();
    }
    return () => {
      canceled = true;
    }

    async function fetchItems() {
      try {
        dispatch({ type: FETCH_ITEMS_STARTED });
        const publicItems = await getFiles();
        const privateItems = await getPrivateFiles();
        const items = privateItems.concat(publicItems);

        if (!canceled) {
          dispatch({ type: FETCH_ITEMS_SUCCEEDED, payload: { items } });
        }
      } catch (error) {
        dispatch({ type: FETCH_ITEMS_FAILED, payload: { error } });
      }
    }
  }

  async function saveItemCallback(file: FileProps) {
    try {
      dispatch({ type: SAVE_ITEM_STARTED });
      const savedFile = await createFile(file);
      dispatch({ type: SAVE_ITEM_SUCCEEDED, payload: { file: savedFile } });
    } catch (error) {
      dispatch({ type: SAVE_ITEM_FAILED, payload: { error } });
    }
  }

  // function wsEffect() {
  //   let canceled = false;
  //   log('wsEffect - connecting');
  //   const closeWebSocket = newWebSocket(message => {
  //     if (canceled) {
  //       return;
  //     }
  //     const { event, payload: { item }} = message;
  //     log(`ws message, item ${event}`);
  //     if (event === 'created' || event === 'updated') {
  //       dispatch({ type: SAVE_ITEM_SUCCEEDED, payload: { item } });
  //     }
  //   });
  //   return () => {
  //     log('wsEffect - disconnecting');
  //     canceled = true;
  //     closeWebSocket();
  //   }
  // }
};
