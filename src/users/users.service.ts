import { Injectable } from '@nestjs/common'
import { User } from 'src/interface/users'

@Injectable()
export class UsersService {
  private readonly users = [
    { id: 1, name: 'John Doe' },
    { id: 2, name: 'Jane Doe' }
  ]

  create(user: User) {
    this.users.push(user)
  }

  findAll(): User[] {
    return this.users
  }
}
