declare module 'redux-persist/lib/storage' {
  import { WebStorage } from 'redux-persist';
  const storage: WebStorage;
  export default storage;
}
