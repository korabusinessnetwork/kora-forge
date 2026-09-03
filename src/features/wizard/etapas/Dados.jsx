import EditorEntidades from '../../../components/wizard/EditorEntidades/EditorEntidades.jsx';

export default function Dados({ valor, onChange }) {
  return <EditorEntidades entidades={valor.entidades} onChange={(entidades) => onChange({ ...valor, entidades })} />;
}
