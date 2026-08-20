'use client'

import Image from 'next/image'
import {
  ArrowLeft,
  ArrowRight,
  Bell,
  Building2,
  FolderKanban,
  GraduationCap,
  Home,
  Inbox,
  Landmark,
  Paperclip,
  Search,
  SlidersHorizontal,
  ArrowUpDown,
  Plus,
  Pencil,
  Trash2,
  Settings,
  MessageCircle,
  PlusCircle,
  Star,
  Send,
  Video,
  Upload,
  UserRound,
  UserPlus,
  Sparkles,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'

const roles = [
  { label: 'Login as Student', icon: GraduationCap, primary: true },
  { label: 'Login as Faculty', icon: Landmark, primary: false },
]

const navItems = [
  { label: 'Home', icon: Home },
  { label: 'My College', icon: Building2 },
  { label: 'Search', icon: Search },
  { label: 'Projects', icon: FolderKanban },
  { label: 'Profile', icon: UserRound },
]

const projects = [
  { title: 'Campus Nav v2.0', status: 'ACTIVE', badge: 'LEGACY', description: 'Audio navigation for visually impaired students across campus.', filled: 3, total: 5, skills: ['React', 'ML'] },
  { title: 'Smart Attendance AI', status: 'ACTIVE', description: 'A smarter way to connect attendance with everyday learning.', filled: 4, total: 5, skills: ['AI', 'React'] },
  { title: 'Alumni Network Portal', status: 'ACTIVE', badge: 'LEGACY', description: 'Bring generations together through mentorship and shared stories.', filled: 2, total: 5, skills: ['Web', 'Social'] },
  { title: 'Green Campus Initiative', status: 'ACTIVE', description: 'A student-led project making everyday campus life more sustainable.', filled: 3, total: 4, skills: ['Research', 'Data'] },
  { title: 'Peer Mentor Connect', status: 'ACTIVE', description: 'Helping students find the right guidance, community, and support.', filled: 1, total: 3, skills: ['UX', 'Next.js'] },
]

function ProjectDetails({ project, onBack, onUser, onProject, onRecommendations, lightMode = false }: { project: (typeof projects)[number]; onBack: () => void; onUser: (user: User) => void; onProject: (project: (typeof projects)[number]) => void; onRecommendations: () => void; lightMode?: boolean }) {
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'auto' }) }, [project.title])
  const [editingTools, setEditingTools] = useState(false)
  const [editingCell, setEditingCell] = useState<{ index: number; field: 'role' | 'skill' } | null>(null)
  const [tools, setTools] = useState(['React Native', 'Node.js', 'Figma'])
  const [team, setTeam] = useState([
    { person: 'Aisha', role: 'Frontend', skill: 'React', filled: true },
    { person: 'Rohan', role: 'Backend', skill: 'Node', filled: true },
    { person: '', role: 'ML Engineer', skill: 'Python', filled: false },
  ])
  const addTeamRow = () => setTeam((rows) => [...rows, { person: '', role: 'New role', skill: 'Add skill', filled: false }])
  const recommendations = [{ name: 'Sara Ahmed', initials: 'SA', role: '3rd Year • CSE', score: '92%', reason: 'Sara has strong React Native skills which fills your frontend gap, and her interest in Accessibility aligns perfectly with this project\'s goals.', skills: ['React', 'UI/UX'] }, { name: 'Leo Martins', initials: 'LM', role: '4th Year • CSE', score: '88%', reason: 'Leo\'s backend experience and API work complement your current team and can help ship a reliable campus experience.', skills: ['Node.js', 'APIs'] }]
  return <main className={`project-details ${lightMode ? 'light-mode' : ''}`}><header className="details-header"><button type="button" onClick={onBack} aria-label="Back to projects"><ArrowLeft size={20} /></button><strong>Project Details</strong><div><button type="button" aria-label="Edit project"><Pencil size={18} /></button><button type="button" aria-label="Delete project"><Trash2 size={18} /></button></div></header><div className="project-hero" aria-hidden="true"><FolderKanban size={42} /></div><h1>{project.title}</h1><div className="detail-badges"><span className="legacy-badge">LEGACY</span><span className="active-badge">OPEN</span></div><p className="detail-meta">Mentor: Prof. Smith · Dept: Computer Science</p><p className="detail-description">Audio navigation app for visually impaired students. Continued from 2023 batch.</p><section className="detail-section"><div className="detail-stat"><strong>Members: {team.filter((member) => member.filled).length}/{team.length + 2}</strong><span>Created: Aug 2024</span></div><div className="detail-progress"><span /></div><h2>Tools</h2><div className="tool-row">{tools.map((tool) => <span key={tool}>{tool}</span>)}<button type="button" aria-label="Edit tools" onClick={() => setEditingTools(true)}><Plus size={15} /></button></div>{editingTools && <TagEditor title="Tools" tags={tools} onChange={setTools} onClose={() => setEditingTools(false)} />}</section>{editingCell && <TagEditor title={editingCell.field === 'role' ? 'Role' : 'Skill'} tags={[team[editingCell.index][editingCell.field]]} onChange={(tags) => setTeam((rows) => rows.map((row, rowIndex) => rowIndex === editingCell.index ? { ...row, [editingCell.field]: tags[0] || (editingCell.field === 'role' ? 'New role' : 'Add skill') } : row))} onClose={() => setEditingCell(null)} />}<section className="detail-section"><h2>Team Composition</h2><div className="team-table"><div className="team-table-head"><span>People</span><span>Role</span><span>Skills / Tools</span></div>{team.map((member, index) => <div className="team-row" key={`${member.role}-${index}`}>{member.person ? <button type="button" className="team-person team-person-button" onClick={() => onUser(users.find((user) => user.name.startsWith(member.person)) || users[0])}><span className="avatar">{member.person[0]}</span><span>{member.person}</span></button> : <span className="team-person"><span className="empty-avatar" /><span className="needed-text">Open role</span></span>}<span className={member.filled ? '' : 'needed-text'}><button type="button" className="team-cell-button" onClick={() => setEditingCell({ index, field: 'role' })}>{member.role}</button></span><span className={member.filled ? '' : 'needed-text'}><button type="button" className="team-cell-button" onClick={() => setEditingCell({ index, field: 'skill' })}>{member.skill}</button></span></div>)}<button type="button" className="add-role" onClick={addTeamRow}>+ Add Role / Skill / Person</button></div></section><section className="detail-section"><h2>Extensions &amp; Lineage</h2><div className="lineage-row"><button type="button" className="lineage-project-card" onClick={() => onProject(projects[0])} aria-label="Open Campus Nav v1.0 details"><span>Parent</span><strong>Campus Nav v1.0</strong><small>2023</small></button><button type="button" className="lineage-project-card lineage-current" onClick={() => { onProject(project); window.scrollTo({ top: 0, behavior: 'auto' }) }} aria-label={`Open ${project.title} details`}><span>Current</span><strong>{project.title}</strong><small>You</small></button><button type="button" className="lineage-add"><Plus size={18} /><span>Branch New Project</span></button></div></section><section className="detail-section"><h2>Invites Sent/Received</h2><div className="invite-list"><p>Sent to: Mina <span>Pending</span></p><p>Received from: Dev <b>Accepted</b></p></div><h2 className="recommendations-heading">AI Recommended Matches <button type="button" onClick={onRecommendations}>View All <ArrowRight size={13} /></button></h2>{[['Sara', '92%'], ['Leo', '87%']].map(([name, score]) => <div className="match-row" key={name}><span className="avatar">{name[0]}</span><strong>{name}</strong><b>{score}</b><button type="button">Invite</button></div>)}</section><section className="detail-section"><h2>Extensions & Lineages</h2><div className="lineage-row">{projects.filter((item) => item.title !== project.title).slice(0, 4).map((relatedProject) => <button type="button" className="lineage-project-card" key={relatedProject.title} onClick={() => onProject(relatedProject)} aria-label={`Open ${relatedProject.title} details`}><FolderKanban size={17} /><strong>{relatedProject.title}</strong><span>{relatedProject.status} · {relatedProject.filled}/{relatedProject.total} members</span></button>)}</div></section></main>
}

function AllRecommendations({ project, onBack, lightMode = false }: { project: (typeof projects)[number]; onBack: () => void; lightMode?: boolean }) { const [invited, setInvited] = useState<string[]>([]); const matches = [{ name: 'Sara Ahmed', initials: 'SA', role: '3rd Year • CSE', score: '92%', reason: "Sara has strong React Native skills which fills your frontend gap, and her interest in Accessibility aligns perfectly with this project's goals.", skills: ['React', 'UI/UX'] }, { name: 'Leo Martins', initials: 'LM', role: '4th Year • CSE', score: '88%', reason: "Leo's backend experience and API work complement your current team and can help ship a reliable campus experience.", skills: ['Node.js', 'APIs'] }, { name: 'Maya Kapoor', initials: 'MK', role: '3rd Year • Design', score: '84%', reason: 'Maya brings research-led product thinking that will make the experience more welcoming and intuitive.', skills: ['Figma', 'Research'] }, { name: 'Rohan Nair', initials: 'RN', role: '4th Year • AI', score: '81%', reason: "Rohan's machine learning background is a strong match for the project's intelligent campus features.", skills: ['Python', 'ML'] }, { name: 'Aisha Khan', initials: 'AK', role: '2nd Year • CSE', score: '78%', reason: "Aisha's accessibility focus and frontend foundations make her a thoughtful contributor for this team.", skills: ['TypeScript', 'Accessibility'] }]; return <main className={`all-recommendations-screen ${lightMode ? 'light-mode' : ''}`}><header className="recommendations-page-header"><button type="button" onClick={onBack} aria-label="Back to project details"><ArrowLeft size={20} /></button><strong>All Recommendations</strong><span /></header><p className="recommendations-context">AI matches for <b>{project.title}</b></p><div className="recommendations-list">{matches.map((match) => { const isInvited = invited.includes(match.name); return <article className="recommendation-card" key={match.name}><div className="recommendation-top"><div className="recommendation-person"><span className="recommendation-avatar">{match.initials}</span><span><strong>{match.name}</strong><small>{match.role}</small></span></div><b className="match-score">{match.score}</b></div><div className="ai-reason"><div><Sparkles size={16} /><strong>AI Match Reason</strong></div><p>{match.reason}</p></div><div className="recommendation-skills">{match.skills.map((skill) => <span key={skill}>{skill}</span>)}</div><button type="button" className={`invite-match-button ${isInvited ? 'invite-match-button-sent' : ''}`} onClick={() => setInvited((items) => isInvited ? items.filter((item) => item !== match.name) : [...items, match.name])}>{isInvited ? 'Invited!' : 'Invite to Team'}</button></article> })}</div></main> }

function ProjectsFeed({ onOpen }: { onOpen: (project: (typeof projects)[number]) => void }) {
  const [createOpen, setCreateOpen] = useState(false)
  return <div className="projects-feed">
    <header className="projects-feed-header"><h1>Projects</h1><div className="projects-feed-actions"><button type="button" aria-label="Filter projects"><SlidersHorizontal size={19} /></button><button type="button" aria-label="Sort projects"><ArrowUpDown size={19} /></button></div></header>
    <section className="project-feed-list" aria-label="Project feed">
      {projects.map((project) => <button type="button" className="feed-project-card" key={project.title} onClick={() => onOpen(project)} aria-label={`Open ${project.title} details`}>
        <div className="feed-project-head"><h2>{project.title}</h2><div className="feed-badges"><span className="active-badge">{project.status}</span>{project.badge && <span className="legacy-badge">{project.badge}</span>}</div></div>
        <p>{project.description}</p>
        <div className="team-status"><span>Team: {project.filled}/{project.total}</span><div className="team-bar" aria-label={`${project.filled} of ${project.total} team slots filled`}><span style={{ width: `${(project.filled / project.total) * 100}%` }} /></div></div>
        <div className="skills-needed" aria-label="Skills needed">{project.skills.map((skill) => <span key={skill}>{skill}</span>)}</div>
      </button>)}
    </section>
    <button type="button" className="projects-fab" aria-label="Create project" onClick={() => setCreateOpen(true)}><Plus size={24} /></button>{createOpen && <div className="create-project-overlay" role="dialog" aria-modal="true" aria-labelledby="create-project-title"><section className="create-project-sheet"><header><h2 id="create-project-title">Create Project</h2><button type="button" aria-label="Close create project" onClick={() => setCreateOpen(false)}>×</button></header><div className="create-project-actions"><button type="button" onClick={() => setCreateOpen(false)}><span className="create-action-icon"><Plus size={21} /></span><span><strong>Empty Project</strong><small>Start something new from scratch</small></span></button><button type="button" onClick={() => setCreateOpen(false)}><span className="create-action-icon github-action">GH</span><span><strong>Pull from GitHub</strong><small>Import an existing repository</small></span></button><button type="button" onClick={() => setCreateOpen(false)}><span className="create-action-icon"><Upload size={21} /></span><span><strong>Upload Project Report</strong><small>Add a report to continue your project</small></span></button><button type="button" className="create-back-button" onClick={() => setCreateOpen(false)}><ArrowLeft size={17} /> Back</button></div></section></div>}
  </div>
}

function CollaborationScreen({ view, onBack, onView }: { view: 'received' | 'sent' | 'notifications'; onBack: () => void; onView: (view: 'received' | 'sent' | 'notifications') => void }) { const [read, setRead] = useState(false); const tabs = [['received', 'Requests'], ['sent', 'Sent'], ['notifications', 'Notifications']] as const; return <main className="collaboration-screen"><header className="collaboration-header"><button type="button" onClick={onBack} aria-label="Back to dashboard"><ArrowLeft size={20} /></button><strong>{view === 'received' ? 'Requests Received' : view === 'sent' ? 'Invites Sent' : 'Notifications'}</strong>{view === 'notifications' ? <button type="button" className="mark-read" onClick={() => setRead(true)}>Mark all as read</button> : <span />}</header><nav className="collaboration-tabs" aria-label="Collaboration views">{tabs.map(([key, label]) => <button type="button" className={view === key ? 'active' : ''} key={key} onClick={() => onView(key)}>{label}</button>)}</nav>{view === 'received' && <div className="collaboration-list"><article className="request-card"><div className="request-top"><span className="request-avatar">MK</span><strong>Mina Khan</strong><time>2h ago</time></div><p>wants to join your project: <b>Campus Nav v2.0</b></p><div className="ai-reason"><Sparkles size={14} /> AI Match: Mina has strong React Native skills and complements your frontend work.</div><div className="request-actions"><button type="button" className="decline">Decline</button><button type="button" className="accept">Accept</button></div></article><article className="request-card"><div className="request-top"><span className="request-avatar lavender">RN</span><strong>Rohan Nair</strong><time>Yesterday</time></div><p>wants to join your project: <b>Smart Attendance AI</b></p><div className="ai-reason"><Sparkles size={14} /> AI Match: Rohan&apos;s Python and ML background fills an important team gap.</div><div className="request-actions"><button type="button" className="decline">Decline</button><button type="button" className="accept">Accept</button></div></article></div>}{view === 'sent' && <div className="collaboration-list"><article className="sent-card"><div className="request-top"><span className="request-avatar">DS</span><strong>Dev Sharma</strong><span className="status pending">Pending</span></div><p>Invited to: <b>Smart Attendance AI</b></p><button type="button" className="cancel-request">Cancel Request</button></article><article className="sent-card"><div className="request-top"><span className="request-avatar lavender">AK</span><strong>Aisha Khan</strong><span className="status accepted">Accepted</span></div><p>Invited to: <b>Campus Nav v2.0</b></p></article><article className="sent-card"><div className="request-top"><span className="request-avatar rose">LM</span><strong>Leo Martins</strong><span className="status declined">Declined</span></div><p>Invited to: <b>Green Campus Initiative</b></p></article></div>}{view === 'notifications' && <div className="notification-list"><article className={`notification-item ${read ? '' : 'unread'}`}><UserPlus size={19} /><p>Aisha accepted your request to join <b>Campus Nav v2.0</b><time>5m ago</time></p></article><article className={`notification-item ${read ? '' : 'unread'}`}><Star size={19} /><p>Your project <b>Green Campus Initiative</b> has a new legacy branch.<time>1h ago</time></p></article><article className="notification-item"><Bell size={19} /><p>Mina Khan sent a request to join <b>Campus Nav v2.0</b><time>2h ago</time></p></article></div>}</main> }

function HomeDashboard({ onProject, onViewAll, onCollaboration, onNotifications }: { onProject: (project: (typeof projects)[number]) => void; onViewAll: () => void; onCollaboration: (view: 'received' | 'sent') => void; onNotifications: () => void }) {
  return (
    <div className="dashboard-content">
      <header className="dashboard-header">
        <h1>Dashboard</h1>
        <button type="button" className="notification-button" aria-label="Notifications" onClick={onNotifications}>
          <Bell size={20} aria-hidden="true" />
          <span className="notification-dot" aria-hidden="true" />
        </button>
      </header>

      <section className="welcome-section">
        <h2>Welcome back, Sadia!</h2>
        <p>Ready to build your legacy today?</p>
      </section>

      <section className="projects-section" aria-labelledby="projects-heading">
        <div className="section-heading"><h2 id="projects-heading">My Projects</h2><button type="button" onClick={onViewAll}>View All</button></div>
        <div className="project-scroller">
          {projects.map((project) => (
            <button type="button" className="project-card" key={project.title} onClick={() => { onProject(project); window.scrollTo({ top: 0, behavior: 'auto' }) }} aria-label={`Open ${project.title} details`}>
              <div className="project-title-row"><h3>{project.title}</h3>{project.badge && <span className="legacy-badge">{project.badge}</span>}</div>
              <p>{project.description}</p>
              <div className="project-meta"><span>Team: {project.filled}/{project.total}</span><div className="skill-list">{project.skills.map((skill) => <span key={skill}>{skill}</span>)}</div></div>
            </button>
          ))}
        </div>
      </section>

      <section className="collaboration-section" aria-labelledby="collaboration-heading">
        <div className="section-heading"><h2 id="collaboration-heading">Collaboration Hub</h2></div>
        <div className="collaboration-grid">
          <button type="button" className="collaboration-card" onClick={() => onCollaboration('sent')}><Paperclip size={24} aria-hidden="true" /><h3>Invites Sent</h3><strong>2 Pending</strong><p>Track outgoing</p></button>
          <button type="button" className="collaboration-card collaboration-card-highlight" onClick={() => onCollaboration('received')}><Inbox size={24} aria-hidden="true" /><h3>Requests Received</h3><strong>2 <span className="new-label"><i />Pending</span></strong><p>Review invitations</p></button>
        </div>
      </section>
    </div>
  )
}

const graphLabels = {
  Projects: ['Campus Nav', 'Attendance AI', 'Library App', 'Green Campus', 'Peer Mentor', 'Study Buddy', 'Event Hub', 'Safe Walk', 'Alumni Portal', 'Wellness App', 'Course Map', 'Food Finder', 'Club Connect', 'Lab Ledger', 'Open Notes'],
  Skills: ['React', 'Python', 'UI/UX', 'AWS', 'TypeScript', 'Figma', 'SQL', 'Next.js', 'Research', 'Writing', 'Java', 'Git', 'Data Viz', 'Leadership', 'Design Systems'],
  People: ['Aarav', 'Maya', 'Sadia', 'Noah', 'Zoya', 'Ethan', 'Isha', 'Leo', 'Aanya', 'Omar', 'Mina', 'Rohan', 'Sara', 'Arjun', 'Lina'],
} as const

type GraphKind = keyof typeof graphLabels
const graphNodes = (kind: GraphKind) => {
  const nodes: { id: string; label: string; x: number; y: number }[] = []
  for (let index = 0; index < graphLabels[kind].length; index += 1) {
    let x = 8 + Math.random() * 84
    let y = 8 + Math.random() * 84
    let attempts = 0
    while (nodes.some((node) => Math.hypot(node.x - x, node.y - y) < 7) && attempts < 80) {
      x = 8 + Math.random() * 84
      y = 8 + Math.random() * 84
      attempts += 1
    }
    nodes.push({ id: `${kind}-${index}`, label: graphLabels[kind][index % graphLabels[kind].length], x, y })
  }
  return nodes
}

function CollegeGraph({ kind, onProject, lightMode = false }: { kind: GraphKind; onProject?: (project: (typeof projects)[number]) => void; lightMode?: boolean }) {
  const nodes = useMemo(() => graphNodes(kind), [kind])
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const drag = useRef({ active: false, x: 0, y: 0 })
  const palette = kind === 'Skills' ? '#2dd4bf' : kind === 'Projects' ? '#fbbf24' : '#fb7185'
  const shape = kind === 'Projects' ? 'graph-node-square' : 'graph-node-dot'
  const updateZoom = (amount: number) => setZoom((value) => Math.min(2.2, Math.max(.7, Number((value + amount).toFixed(2)))))
  return <section className={`college-graph graph-${kind.toLowerCase()} ${lightMode ? 'light-mode' : ''}`} aria-label={`${kind} network graph`}>
    <div className="graph-toolbar"><span>{kind} · {nodes.length} nodes</span><div><button type="button" aria-label="Zoom out" onClick={() => updateZoom(-.2)}>−</button><button type="button" aria-label="Reset graph" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }) }}>1:1</button><button type="button" aria-label="Zoom in" onClick={() => updateZoom(.2)}>+</button></div></div>
    <div className="graph-canvas" onPointerDown={(event) => { drag.current = { active: true, x: event.clientX - pan.x, y: event.clientY - pan.y }; event.currentTarget.setPointerCapture(event.pointerId) }} onPointerMove={(event) => { if (drag.current.active) setPan({ x: event.clientX - drag.current.x, y: event.clientY - drag.current.y }) }} onPointerUp={() => { drag.current.active = false }} onPointerCancel={() => { drag.current.active = false }} onWheel={(event) => { event.preventDefault(); updateZoom(event.deltaY > 0 ? -.1 : .1) }}>
      <div className="graph-world" style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}>
        <svg className="graph-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">{nodes.slice(0, -1).map((node, index) => <line key={node.id} x1={node.x} y1={node.y} x2={nodes[index + 1].x} y2={nodes[index + 1].y} />)}</svg>
        {nodes.map((node, index) => <button type="button" key={node.id} className={`graph-node ${kind === 'Projects' ? 'graph-project-card' : ''}`} style={{ left: `${node.x}%`, top: `${node.y}%`, '--node-color': palette } as React.CSSProperties} onClick={() => kind === 'Projects' && onProject?.(projects[index % projects.length])} aria-label={kind === 'Projects' ? `Open ${node.label} details` : node.label}><span className={shape} /><span className="graph-label">{node.label}{index > 14 && ` ${index + 1}`}</span></button>)}
      </div>
      <span className="graph-hint">Drag to explore · Scroll to zoom</span>
    </div>
  </section>
}

function MyCollege({ onProject, lightMode = false }: { onProject?: (project: (typeof projects)[number]) => void; lightMode?: boolean }) {
  const [subTab, setSubTab] = useState<GraphKind>('Projects')
  const nodeCount = graphLabels[subTab].length
  return <div className={`college-content ${lightMode ? 'light-mode' : ''}`}><header className="college-header"><div><p className="eyebrow">Explore your campus</p><h1>My College</h1></div><span className="college-count">{subTab === 'Skills' ? `${nodeCount} skills` : subTab === 'People' ? `${nodeCount} people` : `${nodeCount} projects`}</span></header><div className="college-tabs" role="tablist">{(['Projects', 'Skills', 'People'] as GraphKind[]).map((tab) => <button key={tab} type="button" role="tab" aria-selected={subTab === tab} className={subTab === tab ? 'college-tab-active' : ''} onClick={() => setSubTab(tab)}>{tab}</button>)}</div><CollegeGraph kind={subTab} onProject={onProject} lightMode={lightMode} /></div>
}

const openRoles = projects.flatMap((project) => Array.from({ length: Math.max(0, project.total - project.filled) }, (_, index) => ({ label: `${project.title}: ${['Frontend Developer', 'ML Engineer', 'Product Designer'][index % 3]}`, project })))

const discoverPeople = [
  { initials: 'AM', name: 'Arjun Mehta', role: 'Backend Dev', skills: ['Node', 'AWS'] },
  { initials: 'MK', name: 'Maya Kapoor', role: 'Product Designer', skills: ['Figma', 'UX'] },
  { initials: 'RN', name: 'Rohan Nair', role: 'ML Engineer', skills: ['Python', 'ML'] },
]

function DiscoverScreen({ onUser, onProject }: { onUser: (user: User) => void; onProject: (project: (typeof projects)[number]) => void }) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('All')
  const filters = ['All', 'People', 'Projects', 'Skills', 'Roles']
  const normalizedQuery = query.toLowerCase().trim()
  const matches = (value: string) => !normalizedQuery || value.toLowerCase().includes(normalizedQuery)
  const visiblePeople = discoverPeople.filter((person) => matches(`${person.name} ${person.role} ${person.skills.join(' ')}`))
  const visibleProjects = projects.filter((project) => matches(`${project.title} ${project.description} ${project.skills.join(' ')}`))
  const visibleSkills = Array.from(new Set(projects.flatMap((project) => project.skills))).filter(matches)
  const visibleRoles = openRoles.filter((role) => matches(role.label))
  const showPeople = filter === 'All' || filter === 'People'
  const showProjects = filter === 'All' || filter === 'Projects'
  const showSkills = filter === 'All' || filter === 'Skills'
  const showRoles = filter === 'All' || filter === 'Roles'
  return <main className="discover-screen"><header className="discover-header"><h1>Discover</h1></header><div className="discover-search"><Search size={20} aria-hidden="true" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search projects, skills, or people..." aria-label="Search projects, skills, or people" />{query && <button type="button" aria-label="Clear search" onClick={() => setQuery('')}>×</button>}</div><div className="discover-filters" role="tablist" aria-label="Discover filters">{filters.map((item) => <button type="button" role="tab" aria-selected={filter === item} className={filter === item ? 'discover-filter-active' : ''} key={item} onClick={() => setFilter(item)}>{item}</button>)}</div><section className={`discover-section ${showPeople ? '' : 'discover-section-hidden'}`}><header><h2>Recommended Teammates</h2><button type="button">View All</button></header><div className="people-scroller">{visiblePeople.map((person) => <button type="button" className="person-card" key={person.name} onClick={() => onUser(users.find((user) => user.name === person.name) || users[0])}><span className="person-avatar">{person.initials}</span><strong>{person.name}</strong><small>{person.role}</small><div className="person-skills">{person.skills.map((skill) => <span key={skill}>{skill}</span>)}</div><span className="person-connect-label">Connect</span></button>)}</div></section>{(showSkills || showRoles) && <section className="discover-section discover-results"><header><h2>{showSkills && filter === 'Skills' ? 'Skills' : 'Roles'}</h2></header><div className="discover-result-chips">{(showSkills && filter !== 'Roles' ? visibleSkills : visibleRoles).map((item) => <span key={typeof item === 'string' ? item : item.label}>{typeof item === 'string' ? item : item.label}</span>)}</div></section>}<section className={`discover-section trending-section ${showProjects ? '' : 'discover-section-hidden'}`}><header><h2>Trending Projects</h2></header><div className="trending-list">{visibleProjects.slice(0, 3).map((project, index) => <button type="button" className="trending-card" key={project.title} onClick={() => { onProject(project); window.scrollTo({ top: 0, behavior: 'auto' }) }} aria-label={`Open ${project.title} details`}><div className="trending-top"><h3>{project.title}</h3><span>{index === 0 ? 'NEW' : 'ACTIVE'}</span></div><p>{project.title === 'Smart Attendance AI' ? 'Intelligent attendance tracking with real-time insights.' : project.description}</p><div className="trending-bottom"><small>Team: {project.filled}/{project.total}</small><div>{['Python', 'ML', 'React'].map((skill) => <span key={skill}>{skill}</span>)}</div></div></button>)}{visibleProjects.length === 0 && <p className="empty-discover">No projects found.</p>}</div></section></main>
}

const profileSections = [
  ['Skills', ['React Native', 'UI/UX', 'Python', 'Figma']],
  ['Interests', ['Accessibility', 'AI/ML', 'Open Source']],
  ['Roles', ['Frontend Lead', 'Product Designer']],
] as const

type User = { initials: string; name: string; role: string; skills: string[] }
const users: User[] = [{ initials: 'AM', name: 'Arjun Mehta', role: 'Backend Developer · 4th Year', skills: ['Node.js', 'AWS', 'APIs'] }, { initials: 'MK', name: 'Maya Kapoor', role: 'Product Designer · 3rd Year', skills: ['Figma', 'UX', 'Research'] }, { initials: 'RN', name: 'Rohan Nair', role: 'ML Engineer · 4th Year', skills: ['Python', 'Machine Learning'] }, { initials: 'SZ', name: 'Sara Zahid', role: 'Frontend Developer · 2nd Year', skills: ['React', 'TypeScript'] }, { initials: 'LP', name: 'Leo Park', role: 'Data Scientist · 3rd Year', skills: ['Python', 'Data'] }, { initials: 'IK', name: 'Isha Khan', role: 'Community Lead · 2nd Year', skills: ['Leadership', 'Events'] }]

function FollowStar({ user, compact = false, following, starred, onFollow, onStar }: { user: User; compact?: boolean; following: boolean; starred: boolean; onFollow: (user: User) => void; onStar: (user: User) => void }) { return <div className={`follow-actions ${compact ? 'follow-actions-compact' : ''}`}><button type="button" className={following ? 'follow-button follow-button-active' : 'follow-button'} onClick={() => onFollow(user)}>{following ? 'Following' : 'Follow'}</button><button type="button" className={starred ? 'star-button star-button-active' : 'star-button'} onClick={() => onStar(user)} aria-label={starred ? 'Unstar' : 'Star'}><Star size={compact ? 16 : 19} fill={starred ? 'currentColor' : 'none'} /></button></div> }

function UserProfileDetail({ user, onBack, onChat, onProject, following, starred, onFollow, onStar, lightMode = false }: { user: User; onBack: () => void; onChat: () => void; onProject: (project: (typeof projects)[number]) => void; following: boolean; starred: boolean; onFollow: (user: User) => void; onStar: (user: User) => void; lightMode?: boolean }) { return <main className={`user-detail-screen ${lightMode ? 'light-mode' : ''}`}><header className="details-header"><button type="button" onClick={onBack} aria-label="Back"><ArrowLeft size={20} /></button><strong>{user.name}</strong><FollowStar user={user} compact following={following} starred={starred} onFollow={onFollow} onStar={onStar} /></header><section className="profile-hero"><div className="profile-avatar">{user.initials[0]}</div><h2>{user.name}</h2><p>{user.role}</p><em>Building useful things and leaving campus better than I found it.</em><FollowStar user={user} following={following} starred={starred} onFollow={onFollow} onStar={onStar} /><button type="button" className="message-button" onClick={onChat}><MessageCircle size={17} /> Message</button></section><div className="profile-sections">{[['Skills', user.skills], ['Interests', ['Accessibility', 'AI/ML', 'Open Source']], ['Roles', [user.role.split(' · ')[0], 'Collaborator']]].map(([title, chips]) => <section className="profile-info-section" key={String(title)}><header><h2>{String(title)}</h2></header><div className="profile-chips">{(chips as string[]).map((chip) => <span key={chip}>{chip}</span>)}</div></section>)}</div><section className="profile-projects"><header><h2>Projects</h2></header><div className="profile-project-scroller">{projects.slice(0, 3).map((project) => <button type="button" className="profile-project-card" key={project.title} onClick={() => { onProject(project); window.scrollTo({ top: 0, behavior: 'auto' }) }} aria-label={`Open ${project.title} details`}><span className="profile-project-icon"><FolderKanban size={16} /></span><strong>{project.title}</strong><small>Active</small></button>)}</div></section></main> }

function ChatScreen({ user, onBack }: { user: User; onBack: () => void }) { const [message, setMessage] = useState(''); const [messages, setMessages] = useState([{ text: 'Hey! I saw your work on Campus Legacy.', sent: false }, { text: 'Thanks! I would love to collaborate.', sent: true }]); const send = () => { if (!message.trim()) return; setMessages([...messages, { text: message.trim(), sent: true }]); setMessage('') }; return <main className="chat-screen"><header className="chat-header"><button type="button" onClick={onBack} aria-label="Back"><ArrowLeft size={20} /></button><span className="connection-avatar">{user.initials}</span><strong>{user.name}</strong><button type="button" className="video-button" aria-label="Video call"><Video size={20} /></button></header><section className="message-list">{messages.map((item, index) => <div key={`${item.text}-${index}`} className={item.sent ? 'message-bubble message-sent' : 'message-bubble message-received'}>{item.text}</div>)}</section><form className="chat-input" onSubmit={(event) => { event.preventDefault(); send() }}><input value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Type a message..." aria-label="Type a message" /><button type="submit" aria-label="Send message"><Send size={18} /></button></form></main> }

function ConnectionsScreen({ starred, followed, onBack, onUser, onChat }: { starred: User[]; followed: User[]; onBack: () => void; onUser: (user: User) => void; onChat: (user: User) => void }) { const [tab, setTab] = useState<'Starred' | 'Followed'>('Starred'); const visible = tab === 'Starred' ? starred : followed; return <main className="connections-screen"><header className="connections-page-header"><button type="button" onClick={onBack} aria-label="Back to profile"><ArrowLeft size={20} /></button><h1>Connections</h1><span>{visible.length}</span></header><div className="connections-tabs" role="tablist">{(['Starred', 'Followed'] as const).map((item) => <button type="button" role="tab" aria-selected={tab === item} className={tab === item ? 'connections-tab-active' : ''} onClick={() => setTab(item)} key={item}>{item}</button>)}</div><section className="connections-list">{visible.length ? visible.map((user) => <article className="connection-card" key={user.name}><button type="button" className="connection-person" onClick={() => onUser(user)}><span className="connection-avatar">{user.initials}</span><span><strong>{user.name}</strong><small>{user.role}</small></span></button><button type="button" onClick={() => onChat(user)}>Message</button></article>) : <p className="empty-connections">No {tab.toLowerCase()} people yet.</p>}</section></main> }

function TagEditor({ title, tags, onChange, onClose }: { title: string; tags: string[]; onChange: (tags: string[]) => void; onClose: () => void }) { const [draft, setDraft] = useState(tags); const [value, setValue] = useState(''); const add = () => { const next = value.trim(); if (next && !draft.includes(next)) { setDraft([...draft, next]); setValue('') } }; const remove = (tag: string) => setDraft(draft.filter((item) => item !== tag)); const save = () => { onChange(draft); onClose() }; return <div className="tag-editor-overlay" role="dialog" aria-modal="true" aria-labelledby="tag-editor-title"><section className="tag-editor-sheet"><header><h2 id="tag-editor-title">Edit {title}</h2><button type="button" onClick={onClose} aria-label="Close editor">×</button></header><div className="tag-editor-chips">{draft.map((tag) => <button type="button" key={tag} onClick={() => remove(tag)} aria-label={`Remove ${tag}`}>{tag} ×</button>)}</div><form className="tag-editor-input" onSubmit={(event) => { event.preventDefault(); add() }}><input value={value} onChange={(event) => setValue(event.target.value)} placeholder={`Add ${title.toLowerCase()}`} aria-label={`Add ${title}`} /><button type="submit">Add</button></form><div className="tag-editor-actions"><button type="button" className="tag-editor-back" onClick={onClose}>Back</button><button type="button" onClick={save}>Save changes</button></div></section></div> }

function ProfileScreen({ onUser, onChat, onProject, followed, starred, onConnections, onAllProjects, onLogout, lightMode, onThemeToggle }: { onUser: (user: User) => void; onChat: (user: User) => void; onProject: (project: (typeof projects)[number]) => void; followed: User[]; starred: User[]; onConnections: () => void; onAllProjects: () => void; onLogout: () => void; lightMode: boolean; onThemeToggle: () => void }) { const [settingsOpen, setSettingsOpen] = useState(false); const [editing, setEditing] = useState<string | null>(null); const [editableSections, setEditableSections] = useState<Record<string, string[]>>(() => Object.fromEntries(profileSections)); const connections = Array.from(new Map([...followed, ...starred].map((user) => [user.name, user])).values()).slice(0, 3); return <main className="profile-screen"><header className="profile-header"><h1>Profile</h1><div><button type="button" aria-label="Settings" onClick={() => setSettingsOpen(true)}><Settings size={20} /></button><button type="button" aria-label="Chat" onClick={() => onChat({ initials: 'S', name: 'Sadia Shaheen', role: '3rd Year · Computer Science', skills: ['React Native', 'UI/UX'] })}><MessageCircle size={20} /></button></div></header><section className="profile-hero"><div className="profile-avatar">S<span /></div><h2>Sadia Shaheen</h2><p>3rd Year · Computer Science</p><em>Building accessible tech for the future.</em></section><div className="profile-sections">{profileSections.map(([title]) => <section className="profile-info-section" key={title}><header><h2>{title}</h2><button type="button" aria-label={`Edit ${title}`} onClick={() => setEditing(title)}><PlusCircle size={19} /></button></header><div className="profile-chips">{(editableSections[title] || []).map((chip) => <span key={chip}>{chip}</span>)}</div></section>)}</div>{editing && <TagEditor title={editing} tags={editableSections[editing] || []} onChange={(tags) => setEditableSections({ ...editableSections, [editing]: tags })} onClose={() => setEditing(null)} />}<section className="profile-projects"><header><h2>My Projects</h2><button type="button" onClick={onAllProjects}>View All <ArrowRight size={13} /></button></header><div className="profile-project-scroller">{projects.slice(0, 3).map((project) => <button type="button" className="profile-project-card" key={project.title} onClick={() => { onProject(project); window.scrollTo({ top: 0, behavior: 'auto' }) }} aria-label={`Open ${project.title} details`}><span className="profile-project-icon"><FolderKanban size={16} /></span><strong>{project.title.replace(' v2.0', '')}</strong><small>Legacy</small></button>)}</div></section><section className="profile-connections"><header><h2>Connections</h2><button type="button" onClick={onConnections}>View All <ArrowRight size={13} /></button></header>{connections.map((user) => <article key={user.name}><button type="button" className="connection-person" onClick={() => onUser(user)}><span className="connection-avatar">{user.initials}</span><div><strong>{user.name}</strong><small>{user.role}</small></div></button><button type="button" onClick={() => onChat(user)}>Message</button></article>)}</section><button type="button" className="branch-link"><span>Explore Computer Science Branch Projects</span><ArrowRight size={19} /></button>{settingsOpen && <div className="settings-overlay" role="dialog" aria-modal="true" aria-labelledby="settings-title"><section className="settings-sheet"><header><h2 id="settings-title">Settings</h2><button type="button" onClick={() => setSettingsOpen(false)} aria-label="Close settings">×</button></header><button type="button" className="theme-toggle" onClick={onThemeToggle}><span>{lightMode ? 'Light mode' : 'Dark mode'}</span><span className={`theme-switch ${lightMode ? 'theme-switch-on' : ''}`} aria-hidden="true"><span /></span></button><button type="button" className="logout-button" onClick={onLogout}>Log out</button></section></div>}</main> }

function AllProjectsScreen({ onBack, onProject }: { onBack: () => void; onProject: (project: (typeof projects)[number]) => void }) { return <main className="all-projects-screen"><header className="details-header"><button type="button" onClick={onBack} aria-label="Back to profile"><ArrowLeft size={20} /></button><strong>My Projects</strong><span /></header><div className="all-projects-list">{projects.map((project) => <button type="button" className="all-project-card" key={project.title} onClick={() => onProject(project)}><span className="profile-project-icon"><FolderKanban size={18} /></span><strong>{project.title}</strong><p>{project.description}</p><small>{project.status} · Team {project.filled}/{project.total}</small></button>)}</div></main> }

function StudentApp({ onBack }: { onBack: () => void }) {
  const [activeTab, setActiveTab] = useState('Home')
  const [selectedProject, setSelectedProject] = useState<(typeof projects)[number] | null>(null)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [chatUser, setChatUser] = useState<User | null>(null)
  const [followed, setFollowed] = useState<User[]>([users[0], users[1]])
  const [starred, setStarred] = useState<User[]>([users[1]])
  const [connectionsOpen, setConnectionsOpen] = useState(false)
  const [allProjectsOpen, setAllProjectsOpen] = useState(false)
  const [recommendationsOpen, setRecommendationsOpen] = useState(false)
  const [collaborationView, setCollaborationView] = useState<'received' | 'sent' | 'notifications' | null>(null)
  const [lightMode, setLightMode] = useState(false)
  const togglePerson = (list: User[], setList: (next: User[]) => void, user: User) => setList(list.some((item) => item.name === user.name) ? list.filter((item) => item.name !== user.name) : [...list, user])
  const onFollow = (user: User) => togglePerson(followed, setFollowed, user)
  const onStar = (user: User) => togglePerson(starred, setStarred, user)
  if (chatUser) return <ChatScreen user={chatUser} onBack={() => setChatUser(null)} />
  if (collaborationView) return <CollaborationScreen view={collaborationView} onBack={() => setCollaborationView(null)} onView={setCollaborationView} />
  if (recommendationsOpen && selectedProject) return <AllRecommendations project={selectedProject} onBack={() => setRecommendationsOpen(false)} lightMode={lightMode} />
  if (allProjectsOpen) return <AllProjectsScreen onBack={() => setAllProjectsOpen(false)} onProject={setSelectedProject} />
  if (connectionsOpen) return <ConnectionsScreen starred={starred} followed={followed} onBack={() => setConnectionsOpen(false)} onUser={setSelectedUser} onChat={setChatUser} />
  if (selectedUser) return <UserProfileDetail user={selectedUser} onBack={() => setSelectedUser(null)} onChat={() => setChatUser(selectedUser)} onProject={(project) => { setSelectedUser(null); setSelectedProject(project); window.scrollTo({ top: 0, behavior: 'auto' }) }} following={followed.some((item) => item.name === selectedUser.name)} starred={starred.some((item) => item.name === selectedUser.name)} onFollow={onFollow} onStar={onStar} lightMode={lightMode} />
  if (selectedProject) return <ProjectDetails project={selectedProject} onBack={() => { setSelectedProject(null); setRecommendationsOpen(false) }} onUser={setSelectedUser} onProject={setSelectedProject} onRecommendations={() => setRecommendationsOpen(true)} lightMode={lightMode} />
  const isHome = activeTab === 'Home'

  return (
    <main className={`student-shell student-dashboard-shell ${activeTab === 'My College' ? 'college-shell' : ''} ${lightMode ? 'light-mode' : ''}`}>
      {isHome ? <HomeDashboard onProject={setSelectedProject} onViewAll={() => setActiveTab('Projects')} onCollaboration={setCollaborationView} onNotifications={() => setCollaborationView('notifications')} /> : activeTab === 'My College' ? <MyCollege onProject={setSelectedProject} lightMode={lightMode} /> : activeTab === 'Search' ? <DiscoverScreen onUser={setSelectedUser} onProject={setSelectedProject} /> : activeTab === 'Projects' ? <ProjectsFeed onOpen={setSelectedProject} /> : activeTab === 'Profile' ? <ProfileScreen onUser={setSelectedUser} onChat={setChatUser} onProject={setSelectedProject} followed={followed} starred={starred} onConnections={() => setConnectionsOpen(true)} onAllProjects={() => { setActiveTab('Projects'); setAllProjectsOpen(false) }} onLogout={onBack} lightMode={lightMode} onThemeToggle={() => setLightMode(!lightMode)} /> : <section className="coming-soon-card"><button type="button" className="back-button" onClick={onBack} aria-label="Back to login"><ArrowLeft size={18} aria-hidden="true" /><span>Back</span></button><div className="student-badge"><GraduationCap size={18} aria-hidden="true" /></div><p className="eyebrow">{activeTab}</p><h1>Coming soon</h1><p className="subheading">We&apos;re shaping a thoughtful campus experience for you.</p></section>}
      <nav className="bottom-nav" aria-label="Student navigation">{navItems.map(({ label, icon: Icon }) => { const active = activeTab === label; return <button type="button" key={label} className={`nav-item ${active ? 'nav-item-active' : ''}`} aria-current={active ? 'page' : undefined} onClick={() => setActiveTab(label)}><Icon size={20} strokeWidth={active ? 2.2 : 1.7} aria-hidden="true" /><span>{label}</span></button> })}</nav>
    </main>
  )
}

export default function Page() {
  const [studentMode, setStudentMode] = useState(false)
  if (studentMode) return <StudentApp onBack={() => setStudentMode(false)} />
  return (
    <main className="login-shell"><div className="ambient ambient-one" aria-hidden="true" /><div className="ambient ambient-two" aria-hidden="true" /><section className="login-panel" aria-labelledby="welcome-heading"><div className="brand-mark" aria-label="Campus Legacy"><span className="brand-dot" aria-hidden="true" /><span>CL</span></div><div className="hero-icon-wrap" aria-hidden="true"><div className="icon-halo" /><Image src="/campus-legacy-icon.png" alt="" width={240} height={240} priority className="hero-icon" /></div><div className="intro"><p className="eyebrow">Your story starts here</p><h1 id="welcome-heading">Welcome to Campus Legacy</h1><p className="subheading">Connect, learn, and leave a mark that lasts.</p></div><div className="role-list" aria-label="Choose your login type">{roles.map(({ label, icon: Icon, primary }) => <button type="button" className={`role-button ${primary ? 'role-button-primary' : ''}`} key={label} onClick={() => primary && setStudentMode(true)}><span className="role-icon"><Icon size={20} strokeWidth={1.7} /></span><span>{label}</span><ArrowRight className="role-arrow" size={18} strokeWidth={1.8} aria-hidden="true" /></button>)}</div><button type="button" className="guest-link">Continue as Guest <span aria-hidden="true">���</span></button><p className="footer-note">A shared space for every generation.</p></section></main>
  )
}
