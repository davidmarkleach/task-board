import { avatarColor, initials } from './util'

export default function Avatar({ profile, size = 24 }) {
  if (!profile) return null
  return (
    <span
      className="avatar"
      title={profile.full_name}
      style={{ background: avatarColor(profile.id), width: size, height: size, fontSize: size * 0.42 }}
    >
      {initials(profile.full_name)}
    </span>
  )
}
