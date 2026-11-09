import * as React from 'react';
import renderer, { act } from 'react-test-renderer';
import { ThemeProvider } from '@rneui/themed';

import { ThemedText } from '../ThemedText';

it(`renders correctly`, async () => {
  let tree!: renderer.ReactTestRenderer;
  await act(async () => {
    tree = renderer.create(
      <ThemeProvider>
        <ThemedText>Snapshot test!</ThemedText>
      </ThemeProvider>
    );
  });

  expect(tree.toJSON()).toMatchSnapshot();
});
