interface Props {
  channels: string[]; channel: string; search: string; direction: string;
  onChannel: (value: string) => void; onSearch: (value: string) => void; onDirection: (value: string) => void;
}
export default function Filters(props: Props) {
  return <div className="filters">
    <label>Typ / kanál<select value={props.channel} onChange={e => props.onChannel(e.target.value)}>
      <option value="">Všechny typy</option>
      {props.channels.map(channel => <option key={channel}>{channel}</option>)}
    </select></label>
    <label>Směr<select value={props.direction} onChange={e => props.onDirection(e.target.value)}>
      <option value="">Oba směry</option><option value="in">Příchozí</option><option value="out">Odchozí</option>
    </select></label>
    <label className="search">Hledat ve zprávách<input type="search" placeholder="Kanál, téma nebo obsah JSON…" value={props.search} onChange={e => props.onSearch(e.target.value)} /></label>
  </div>;
}
