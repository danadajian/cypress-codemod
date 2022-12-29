import { render } from 'enzyme';
import * as React from 'react';
import { SomeComponent, SomeInnerComponent } from 'some-lib';

jest.mock('some-module');

const mockFn = jest.fn();

describe('SomeComponent', () => {
  it('test 1', () => {
    const wrapper = render(
      <SomeComponent>
        <SomeInnerComponent someProp={'someProp'} />
      </SomeComponent>
    );
  });

  it('test 2', () => {
    render(
      <SomeComponent>
        <SomeInnerComponent someProp={'someProp'} />
      </SomeComponent>
    );
  });

  it('test 3', () => {
    const view = render(
      <SomeComponent>
        <SomeInnerComponent someProp={'someProp'} />
      </SomeComponent>
    );
    expect(view.container).toBeEmptyDOMElement();
  });

  it('test 4', () => {
    render(
      <SomeComponent>
        <SomeInnerComponent someProp={'someProp'} />
      </SomeComponent>
    );
    expect(screen.getByRole('heading', { name: /Heading 1/i })).toBeVisible();
  });

  it('test 5', async () => {
    render(
      <SomeComponent>
        <SomeInnerComponent someProp={'someProp'} />
      </SomeComponent>
    );
    expect(await screen.getByRole('heading', { name: /Heading 2/i })).toBeVisible();
  });

  it('test 6', async () => {
    const view = render(
      <SomeComponent>
        <SomeInnerComponent someProp={'someProp'} />
      </SomeComponent>
    );
    await waitFor(() => expect(view.container).toBeEmptyDOMElement());
  });

  test('test 7', () => {
    render(
      <SomeComponent>
        <SomeInnerComponent someProp={'someProp'} />
      </SomeComponent>
    );
    expect(screen.getByText('Some text')).toBeVisible();
  });

  it('test 8', () => {
    render(
      <SomeComponent>
        <SomeInnerComponent someProp={'someProp'} />
      </SomeComponent>
    );
    expect(screen.queryByText('Some text')).toBeNull();
  });

  it('test 9', () => {
    render(
      <SomeComponent mockFn={mockFn}>
        <SomeInnerComponent someProp={'someProp'} />
      </SomeComponent>
    );
    expect(mockFn).toBeCalledTimes(1);
    expect(mockFn).toHaveBeenCalledWith('some argument');
  });
});

test('separate test', async () => {
  render(
    <SomeComponent>
      <SomeInnerComponent someProp={'someProp'} />
    </SomeComponent>
  );
});
