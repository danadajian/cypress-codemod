import { render } from 'enzyme';
import * as React from 'react';
import { SomeComponent, SomeInnerComponent } from 'some-lib';

describe('SomeComponent', () => {
  it('test 1', () => {
    cy.render(
      <SomeComponent>
        <SomeInnerComponent someProp={'someProp'} />
      </SomeComponent>
    );
  });

  it('test 2', () => {
    cy.render(
      <SomeComponent>
        <SomeInnerComponent someProp={'someProp'} />
      </SomeComponent>
    );
  });

  it('test 3', () => {
    cy.render(
      <SomeComponent>
        <SomeInnerComponent someProp={'someProp'} />
      </SomeComponent>
    );
    cy.expectDOMToBeEmpty();
  });

  it('test 4', () => {
    cy.render(
      <SomeComponent>
        <SomeInnerComponent someProp={'someProp'} />
      </SomeComponent>
    );
    cy.findByRole('heading', { name: /Heading 1/i }).should('be.visible');
  });

  it('test 5', () => {
    cy.render(
      <SomeComponent>
        <SomeInnerComponent someProp={'someProp'} />
      </SomeComponent>
    );
    cy.findByRole('heading', { name: /Heading 2/i }).should('be.visible');
  });

  it('test 6', () => {
    cy.render(
      <SomeComponent>
        <SomeInnerComponent someProp={'someProp'} />
      </SomeComponent>
    );

    waitFor(() => expect(view.container).toBeEmptyDOMElement());
  });

  it('test 7', () => {
    cy.render(
      <SomeComponent>
        <SomeInnerComponent someProp={'someProp'} />
      </SomeComponent>
    );
    cy.findByText('Some text').should('be.visible');
  });

  it('test 8', () => {
    cy.render(
      <SomeComponent>
        <SomeInnerComponent someProp={'someProp'} />
      </SomeComponent>
    );
    cy.findByText('Some text').should('not.exist');
  });

  it('test 9', () => {
    const mockFn = cy.stub().as('mockFn');
    cy.render(
      <SomeComponent mockFn={mockFn}>
        <SomeInnerComponent someProp={'someProp'} />
      </SomeComponent>
    );
    cy.get('@mockFn').should('have.callCount', 1);
    cy.get('@mockFn').should('have.been.calledWith', 'some argument');
  });
});

describe('separate test', () => {
  it('separate test', () => {
    cy.render(
      <SomeComponent>
        <SomeInnerComponent someProp={'someProp'} />
      </SomeComponent>
    );
  });
});
