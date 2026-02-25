declare module 'react-native/Libraries/Core/ExceptionsManager' {
  export function handleException(err: Error, isFatal: boolean): void;
}

declare module 'react-native-web-refresh-control' {
  import { ComponentType } from 'react';
  import { RefreshControlProps } from 'react-native';

  const RefreshControl: ComponentType<RefreshControlProps>;
  export { RefreshControl };
}
