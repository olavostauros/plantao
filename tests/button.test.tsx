import { describe, expect, it } from 'vitest';
import { render } from 'preact-render-to-string';
import { Button } from '../src/components/ui/Button';

describe('Button', () => {
  it('renderiza um <button type="button"> por padrão', () => {
    const html = render(<Button>Responder</Button>);
    expect(html).toMatch(/^<button type="button" class="[^"]*min-h-11[^"]*">Responder<\/button>$/);
  });

  it('aplica a variante e repassa atributos', () => {
    const html = render(
      <Button variant="secondary" type="submit" disabled aria-describedby="dica" class="w-full">
        Enviar
      </Button>,
    );
    expect(html).toContain('type="submit"');
    expect(html).toContain('bg-bg text-fg');
    expect(html).toContain('w-full');
    expect(html).toContain('disabled');
    expect(html).toContain('aria-describedby="dica"');
  });
});
