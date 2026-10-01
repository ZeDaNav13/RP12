import logo from "../assets/Logo_iS2-removebg-preview.png";

export default function ToolHeader({ title }) {
  return (
    <section className="card headerCard toolHeader screenOnly">
      <h1>{title}</h1>
      <img className="headerLogo" src={logo} alt="Logo iS2" />
    </section>
  );
}
